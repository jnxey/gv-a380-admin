<template>
  <ShopSwitcher />
  <el-card>
    <QueryBar @search="searchBills" @reset="resetQuery">
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
      <div v-if="isEmpty(billList)" class="record-empty">暂无数据</div>
      <div v-else class="bill-list">
        <article v-for="billRow in billList" :key="billRow.billNo" class="bill-item">
          <div class="bill-item-row">
            <div class="bill-item-main">
              <el-tag :type="billAmountTagType(shopDirection(billRow.direction))" effect="plain" size="small">{{ statusLabel(shopDirection(billRow.direction)) }}</el-tag>
              <span class="bill-item-title">
                {{ displayText(billRow.shopName) }} ·
                <span class="bill-member-copy" title="点击复制会员号" @click="copyMemberNo(billRow.username)">{{ displayText(billRow.username) }}</span>
              </span>
              <span class="bill-item-type">{{ statusLabel(billRow.bizType) }}</span>
            </div>
            <div class="bill-item-amount" :class="billAmountClass(shopDirection(billRow.direction))">{{ formatBillAmount(billRow) }}</div>
          </div>
          <div class="bill-item-row bill-item-meta">
            <span>{{ formatLocalDateTime(billRow.createdAt) }}</span>
            <span>账单号 {{ displayText(billRow.billNo) }}</span>
            <span>业务单号 {{ displayText(billRow.bizOrderNo) }}</span>
            <span>变动 {{ billRow.balanceBefore }} → {{ billRow.balanceAfter }}</span>
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
  </el-card>
</template>

<script setup lang="ts">
import { KtvApi } from '../../../api/ktv';
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { FinanceBizType, FinanceDirection, PageSetting, statusLabel } from '../../../utils/constants';
import { isEmpty, formatLocalDateTime, copyTextToClipboard } from '../../../utils/tools';
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

const keyword = ref('');
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
const exporting = ref(false);

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
 * 点击会员号复制到剪贴板。
 */
async function copyMemberNo(memberNo: string): Promise<void> {
  if (await copyTextToClipboard(memberNo)) {
    ElMessage.success('会员号已复制');
    return;
  }
  ElMessage.error('复制失败');
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
    const exportResult = (await http.get(KtvApi.BILLS_EXPORT, {
      params: {
        keyword: keyword.value,
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
    const csvContent = `\uFEFF${lineList.join('\r\n')}`;
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(csvBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = `KTV流水_${formatLocalDateText(new Date())}.csv`;
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
 * 汇总当前门店的收入和支出。关键字不参与。
 */
async function loadSummary(): Promise<void> {
  const billDateQuery = readBillDateQuery();
  try {
    const summaryResult = (await http.get(KtvApi.BILLS_SUMMARY, {
      params: {
        bizType: bizType.value,
        startDate: billDateQuery.startDate,
        endDate: billDateQuery.endDate,
      },
    })) as { list: ShopSummaryRow[]; inAmount: string; outAmount: string };
    summaryList.value = summaryResult.list;
    summaryInAmount.value = summaryResult.inAmount;
    summaryOutAmount.value = summaryResult.outAmount;
  } catch {
    summaryList.value = [];
    summaryInAmount.value = '';
    summaryOutAmount.value = '';
  }
}

/**
 * 查询当前门店财务流水。
 */
async function loadBills(): Promise<void> {
  const billDateQuery = readBillDateQuery();
  try {
    const pageResult = (await http.get(KtvApi.BILLS, {
      params: {
        keyword: keyword.value,
        bizType: bizType.value,
        startDate: billDateQuery.startDate,
        endDate: billDateQuery.endDate,
        page: page.value,
        pageSize: pageSize.value,
      },
    })) as { list: BillRow[]; total: number };
    billList.value = pageResult.list;
    total.value = pageResult.total;
  } catch {
    billList.value = [];
    total.value = 0;
  }
}

/**
 * 从第一页重新查询流水和汇总。
 */
function searchBills(): void {
  page.value = PageSetting.DEFAULT_PAGE;
  void loadSummary();
  void loadBills();
}

/**
 * 清空条件，日期回到本月，并回到第一页。
 */
function resetQuery(): void {
  keyword.value = '';
  bizType.value = '';
  billDateRange.value = currentMonthDateRange();
  page.value = PageSetting.DEFAULT_PAGE;
  void loadSummary();
  void loadBills();
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadBills();
}

/**
 * 改每页条数后从第一页重查。
 */
function onPageSizeChange(nextPageSize: number): void {
  pageSize.value = nextPageSize;
  page.value = PageSetting.DEFAULT_PAGE;
  void loadSummary();
  void loadBills();
}

onMounted(() => {
  void loadSummary();
  void loadBills();
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
  gap: 8px;
}

.bill-item {
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.bill-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.bill-item-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.bill-item-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
  word-break: break-word;
}

.bill-item-type {
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.bill-item-amount {
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
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
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: #667085;
}

.bill-member-copy {
  cursor: pointer;
  color: #3b82f6;
}

.bill-member-copy:hover {
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
