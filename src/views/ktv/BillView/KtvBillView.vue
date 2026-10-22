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
        <el-date-picker
          v-model="billDateRange"
          class="bill-date-range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
      </el-form-item>
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
            <span>账单号 {{ displayText(billRow.billNo) }}</span>
            <span>业务单号 {{ displayText(billRow.bizOrderNo) }}</span>
            <span>变动前 {{ billRow.balanceBefore }}</span>
            <span>变动后 {{ billRow.balanceAfter }}</span>
            <span v-if="isEmpty(billRow.remark) !== true">备注 {{ billRow.remark }}</span>
          </div>
        </article>
      </div>
    </section>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
  </el-card>
</template>

<script setup lang="ts">
import { KtvApi } from '../../../api/ktv';
import { onMounted, ref } from 'vue';
import ListPager from '../../../components/ListPager/ListPager.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { FinanceBizType, FinanceDirection, PageSetting, statusLabel } from '../../../utils/constants';
import { isEmpty, formatLocalDateTime } from '../../../utils/tools';
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
