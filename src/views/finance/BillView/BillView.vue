<template>
  <el-card>
    <QueryBar @search="searchBills" @reset="resetQuery">
      <el-form-item>
        <el-select v-model="shopId" v-place class="query-keyword" placeholder="门店">
          <el-option label="全部" value="" />
          <el-option v-for="shop in sessionStore.shopList" :key="shop.shopId" :label="shop.shopName" :value="shop.shopId" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-input v-model="keyword" v-place class="query-keyword" placeholder="用户名/手机号/邮箱" clearable />
      </el-form-item>
      <el-form-item>
        <el-select v-model="bizType" v-place class="query-keyword" clearable placeholder="流水类型">
          <el-option v-for="item in bizTypeOptions" :key="item" :label="statusLabel(item)" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button-group class="bill-date-quick">
          <el-button @click="applyQuickDate('today')">今天</el-button>
          <el-button @click="applyQuickDate('last7')">近7天</el-button>
          <el-button @click="applyQuickDate('month')">本月</el-button>
        </el-button-group>
      </el-form-item>
      <el-form-item>
        <el-date-picker
          v-model="billDateRange"
          class="bill-date-range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          single-panel
        />
      </el-form-item>
      <template #append>
        <el-form-item class="query-actions">
          <el-button :loading="exporting" @click="exportBills">导出</el-button>
        </el-form-item>
      </template>
    </QueryBar>
    <div class="bill-scope-tip">本页按门店口径：会员消费为门店收入，会员充值为门店支出。查看会员加减请用「用户流水」。</div>
    <div v-loading="loading">
      <div v-if="isEmpty(summaryList) !== true" class="bill-summary-line">
        <div class="bill-total is-in">
          <span class="bill-total-label">收入</span>
          <span class="bill-total-amount">{{ summaryOutAmount }}</span>
        </div>
        <div class="bill-total is-out">
          <span class="bill-total-label">支出</span>
          <span class="bill-total-amount">{{ summaryInAmount }}</span>
        </div>
        <div v-for="summaryRow in summaryList" :key="summaryRow.shopId" class="bill-shop-chip">
          <span class="bill-shop-name">{{ displayText(summaryRow.shopName) }}</span>
          <span class="bill-shop-amount is-in">收入 {{ summaryRow.outAmount }}</span>
          <span class="bill-shop-amount is-out">支出 {{ summaryRow.inAmount }}</span>
        </div>
      </div>
      <section class="bill-section">
        <h2 class="bill-section-title">流水明细</h2>
        <div v-if="loading !== true && isEmpty(billList)" class="record-empty">{{ emptyTip }}</div>
        <div v-else-if="isEmpty(billList) !== true" class="bill-list">
          <article v-for="billRow in billList" :key="billRow.billNo" class="bill-item">
            <div class="bill-item-top">
              <div class="bill-item-main">
                <div class="bill-item-title">{{ displayText(billRow.shopName) }} · {{ displayText(billRow.username) }}</div>
                <div class="bill-item-sub">
                  <el-tag :type="billAmountTagType(shopDirection(billRow.direction))" effect="plain">{{ statusLabel(shopDirection(billRow.direction)) }}</el-tag>
                  <span>{{ statusLabel(billRow.bizType) }}</span>
                  <span>{{ formatLocalDateTime(billRow.createdAt) }}</span>
                </div>
              </div>
              <div class="bill-item-amount" :class="billAmountClass(shopDirection(billRow.direction))">{{ formatBillAmount(billRow) }}</div>
            </div>
            <div class="bill-item-meta">
              <span class="bill-no-copy" title="点击复制" @click="copyBillNo(billRow.billNo)">账单号 {{ displayText(billRow.billNo) }}</span>
              <span>业务单号 {{ displayText(billRow.bizOrderNo) }}</span>
              <span>变动前 {{ billRow.balanceBefore }}</span>
              <span>变动后 {{ billRow.balanceAfter }}</span>
              <span v-if="isEmpty(billRow.operatorName) !== true">操作人 {{ billRow.operatorName }}</span>
              <span v-if="isEmpty(billRow.remark) !== true">备注 {{ billRow.remark }}</span>
            </div>
          </article>
        </div>
      </section>
      <ListPager
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[...PageSetting.PAGE_SIZE_OPTIONS]"
        @current-change="onPageChange"
        @size-change="onPageSizeChange"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { FinanceApi } from '../../../api/finance';
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import { FinanceBizType, FinanceDirection, PageSetting, statusLabel } from '../../../utils/constants';
import { isEmpty, formatLocalDateTime } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface BillRow {
  billNo: string;
  shopName: string;
  username: string;
  bizType: string;
  direction: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  bizOrderNo: string;
  operatorName: string;
  remark: string;
  createdAt: string;
}

interface ShopSummaryRow {
  shopId: string;
  shopName: string;
  inAmount: string;
  outAmount: string;
}

const sessionStore = useSessionStore();
const keyword = ref('');
const shopId = ref('');
const bizType = ref('');
const bizTypeOptions = Object.values(FinanceBizType);
const billDateRange = ref<[string, string] | null>(currentMonthDateRange());
const summaryList = ref<ShopSummaryRow[]>([]);
const summaryInAmount = ref('');
const summaryOutAmount = ref('');
const billList = ref<BillRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);
const loading = ref(false);
const exporting = ref(false);
const emptyTip = ref('暂无数据');

/**
 * 空文本显示成横线。
 */
function displayText(text: string): string {
  if (isEmpty(text)) {
    return '—';
  }
  return text;
}

/**
 * 把会员余额方向换成门店口径。会员支出是门店收入，会员收入是门店支出。
 */
function shopDirection(memberDirection: string): string {
  if (memberDirection === FinanceDirection.OUT) {
    return FinanceDirection.IN;
  }
  if (memberDirection === FinanceDirection.IN) {
    return FinanceDirection.OUT;
  }
  return memberDirection;
}

/**
 * 收入用绿色，支出用红色。
 */
function billAmountClass(direction: string): string {
  if (direction === FinanceDirection.IN) {
    return 'is-in';
  }
  if (direction === FinanceDirection.OUT) {
    return 'is-out';
  }
  return '';
}

/**
 * 方向标签颜色。收入成功色，支出危险色。
 */
function billAmountTagType(direction: string): 'success' | 'danger' | 'info' {
  if (direction === FinanceDirection.IN) {
    return 'success';
  }
  if (direction === FinanceDirection.OUT) {
    return 'danger';
  }
  return 'info';
}

/**
 * 收入金额前加正号，支出前加负号。
 */
function formatBillAmount(billRow: BillRow): string {
  const direction = shopDirection(billRow.direction);
  if (direction === FinanceDirection.IN) {
    return `+${billRow.amount}`;
  }
  if (direction === FinanceDirection.OUT) {
    return `-${billRow.amount}`;
  }
  return billRow.amount;
}

/**
 * 把日期数字补成两位。
 */
function padDatePart(datePart: number): string {
  return String(datePart).padStart(2, '0');
}

/**
 * 把本地日期格式化成 YYYY-MM-DD。
 */
function formatLocalDateText(dateValue: Date): string {
  const yearText = String(dateValue.getFullYear());
  const monthText = padDatePart(dateValue.getMonth() + 1);
  const dayText = padDatePart(dateValue.getDate());
  return `${yearText}-${monthText}-${dayText}`;
}

/**
 * 本月 1 日到今天，按电脑本地日期。
 */
function currentMonthDateRange(): [string, string] {
  const today = new Date();
  const yearText = String(today.getFullYear());
  const monthText = padDatePart(today.getMonth() + 1);
  const dayText = padDatePart(today.getDate());
  return [`${yearText}-${monthText}-01`, `${yearText}-${monthText}-${dayText}`];
}

/**
 * 今天到今天。
 */
function todayDateRange(): [string, string] {
  const todayText = formatLocalDateText(new Date());
  return [todayText, todayText];
}

/**
 * 近 7 天（含今天）到今天。
 */
function last7DaysDateRange(): [string, string] {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  return [formatLocalDateText(startDate), formatLocalDateText(today)];
}

/**
 * 点快捷日期后立刻按新范围查询。
 */
function applyQuickDate(quickDateKind: 'today' | 'last7' | 'month'): void {
  if (quickDateKind === 'today') {
    billDateRange.value = todayDateRange();
  } else if (quickDateKind === 'last7') {
    billDateRange.value = last7DaysDateRange();
  } else {
    billDateRange.value = currentMonthDateRange();
  }
  searchBills();
}

/**
 * 取出查询栏里的开始和结束日期。没选时两端都为空。
 */
function readBillDateQuery(): { startDate: string; endDate: string } {
  if (isEmpty(billDateRange.value)) {
    return { startDate: '', endDate: '' };
  }
  return {
    startDate: billDateRange.value[0],
    endDate: billDateRange.value[1],
  };
}

/**
 * 从请求失败结果里取出后端文案。
 */
function readFailMessage(error: unknown): string {
  if (isEmpty(error) || typeof error !== 'object') {
    return '';
  }
  const errorRecord = error as { message?: unknown; response?: { data?: { message?: unknown } } };
  if (typeof errorRecord.message === 'string' && isEmpty(errorRecord.message) !== true) {
    return errorRecord.message;
  }
  const responseMessage = errorRecord.response?.data?.message;
  if (typeof responseMessage === 'string' && isEmpty(responseMessage) !== true) {
    return responseMessage;
  }
  return '';
}

/**
 * 按当前条件写空列表提示。
 */
function writeEmptyTip(failMessage: string): void {
  const cleanedKeyword = keyword.value.trim();
  if (isEmpty(cleanedKeyword)) {
    emptyTip.value = '暂无数据';
    return;
  }
  if (failMessage.indexOf('未找到') >= 0) {
    emptyTip.value = '未找到该聊天用户';
    return;
  }
  emptyTip.value = '该用户在当前条件下没有流水';
}

/**
 * 点击账单号复制到剪贴板。
 */
async function copyBillNo(billNo: string): Promise<void> {
  if (isEmpty(billNo)) {
    return;
  }
  try {
    await navigator.clipboard.writeText(billNo);
    ElMessage.success('账单号已复制');
  } catch {
    ElMessage.error('复制失败');
  }
}

/**
 * CSV 单元格转义。含逗号、引号或换行时用双引号包起来。
 */
function escapeCsvCell(cellText: string): string {
  if (cellText.indexOf('"') >= 0 || cellText.indexOf(',') >= 0 || cellText.indexOf('\n') >= 0 || cellText.indexOf('\r') >= 0) {
    return `"${cellText.replace(/"/g, '""')}"`;
  }
  return cellText;
}

/**
 * 按当前筛选条件导出 CSV。方向按门店口径。
 */
async function exportBills(): Promise<void> {
  exporting.value = true;
  try {
    const billDateQuery = readBillDateQuery();
    const exportResult = (await http.get(FinanceApi.BILLS_EXPORT, {
      params: {
        keyword: keyword.value,
        shopId: shopId.value,
        bizType: bizType.value,
        startDate: billDateQuery.startDate,
        endDate: billDateQuery.endDate,
      },
    })) as { list: BillRow[] };
    const headerList = ['账单号', '门店', '用户名', '流水类型', '方向', '金额', '变动前', '变动后', '业务单号', '操作人', '备注', '时间'];
    const lineList = [headerList.map((headerText) => escapeCsvCell(headerText)).join(',')];
    for (const billRow of exportResult.list) {
      const direction = shopDirection(billRow.direction);
      lineList.push(
        [
          billRow.billNo,
          billRow.shopName,
          billRow.username,
          statusLabel(billRow.bizType),
          statusLabel(direction),
          formatBillAmount(billRow),
          billRow.balanceBefore,
          billRow.balanceAfter,
          billRow.bizOrderNo,
          isEmpty(billRow.operatorName) ? '' : billRow.operatorName,
          isEmpty(billRow.remark) ? '' : billRow.remark,
          formatLocalDateTime(billRow.createdAt),
        ]
          .map((cellText) => escapeCsvCell(String(cellText)))
          .join(','),
      );
    }
    // 1. 加 BOM，方便 Excel 直接打开中文
    const csvContent = `\uFEFF${lineList.join('\r\n')}`;
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(csvBlob);
    const downloadLink = document.createElement('a');
    const todayText = formatLocalDateText(new Date());
    downloadLink.href = downloadUrl;
    downloadLink.download = `财务流水_${todayText}.csv`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(downloadUrl);
    ElMessage.success(`已导出 ${exportResult.list.length} 条`);
  } catch {
    // 失败文案由请求拦截器提示
  } finally {
    exporting.value = false;
  }
}

/**
 * 按门店、时间和关键字汇总收入、支出。关键字与明细一致。
 */
async function loadSummary(): Promise<void> {
  const billDateQuery = readBillDateQuery();
  const summaryResult = (await http.get(FinanceApi.BILLS_SUMMARY, {
    params: {
      keyword: keyword.value,
      shopId: shopId.value,
      bizType: bizType.value,
      startDate: billDateQuery.startDate,
      endDate: billDateQuery.endDate,
    },
  })) as { list: ShopSummaryRow[]; inAmount: string; outAmount: string };
  summaryList.value = summaryResult.list;
  summaryInAmount.value = summaryResult.inAmount;
  summaryOutAmount.value = summaryResult.outAmount;
}

/**
 * 查询已绑定门店的财务流水。
 */
async function loadBills(): Promise<void> {
  const billDateQuery = readBillDateQuery();
  const pageResult = (await http.get(FinanceApi.BILLS, {
    params: {
      keyword: keyword.value,
      shopId: shopId.value,
      bizType: bizType.value,
      startDate: billDateQuery.startDate,
      endDate: billDateQuery.endDate,
      page: page.value,
      pageSize: pageSize.value,
    },
  })) as { list: BillRow[]; total: number };
  billList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 同时拉汇总和明细，并处理空状态。
 */
async function loadSummaryAndBills(): Promise<void> {
  loading.value = true;
  emptyTip.value = '暂无数据';
  try {
    await Promise.all([loadSummary(), loadBills()]);
    if (isEmpty(billList.value)) {
      writeEmptyTip('');
    }
  } catch (error) {
    summaryList.value = [];
    summaryInAmount.value = '';
    summaryOutAmount.value = '';
    billList.value = [];
    total.value = 0;
    writeEmptyTip(readFailMessage(error));
  } finally {
    loading.value = false;
  }
}

/**
 * 从第一页重新查询流水和汇总。
 */
function searchBills(): void {
  page.value = PageSetting.DEFAULT_PAGE;
  void loadSummaryAndBills();
}

/**
 * 清空条件，日期回到本月，并回到第一页。
 */
function resetQuery(): void {
  keyword.value = '';
  shopId.value = '';
  bizType.value = '';
  billDateRange.value = currentMonthDateRange();
  page.value = PageSetting.DEFAULT_PAGE;
  void loadSummaryAndBills();
}

/**
 * 翻页。
 */
async function onPageChange(nextPage: number): Promise<void> {
  page.value = nextPage;
  loading.value = true;
  try {
    await loadBills();
    if (isEmpty(billList.value)) {
      writeEmptyTip('');
    }
  } catch (error) {
    billList.value = [];
    total.value = 0;
    writeEmptyTip(readFailMessage(error));
  } finally {
    loading.value = false;
  }
}

/**
 * 改每页条数后从第一页重查。
 */
function onPageSizeChange(nextPageSize: number): void {
  pageSize.value = nextPageSize;
  page.value = PageSetting.DEFAULT_PAGE;
  void loadSummaryAndBills();
}

onMounted(() => {
  void loadSummaryAndBills();
});
</script>

<style scoped>
.bill-date-range {
  width: 260px;
  max-width: 100%;
}

.bill-date-quick {
  flex-shrink: 0;
}

.bill-scope-tip {
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.bill-summary-line {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.bill-total,
.bill-shop-chip {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f7f8fa;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.bill-total-label {
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.bill-total-amount {
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  font-variant-numeric: tabular-nums;
  color: #1c2434;
}

.bill-total.is-in .bill-total-amount,
.bill-shop-amount.is-in {
  color: #15803d;
}

.bill-total.is-out .bill-total-amount,
.bill-shop-amount.is-out {
  color: #b91c1c;
}

.bill-section-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
}

.bill-shop-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
  white-space: nowrap;
}

.bill-shop-amount {
  font-size: 13px;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.bill-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bill-item {
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.bill-item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.bill-item-main {
  min-width: 0;
}

.bill-item-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
  word-break: break-word;
}

.bill-item-sub {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.bill-item-amount {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  font-variant-numeric: tabular-nums;
  color: #1c2434;
}

.bill-item-amount.is-in {
  color: #15803d;
}

.bill-item-amount.is-out {
  color: #b91c1c;
}

.bill-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-top: 10px;
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.bill-no-copy {
  cursor: pointer;
  color: #3b82f6;
}

.bill-no-copy:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .bill-item {
    padding: 12px 0;
    background: transparent;
    border: none;
    border-radius: 0;
    border-bottom: 1px solid #e6e8ec;
  }

  .bill-list {
    gap: 0;
  }
}
</style>
