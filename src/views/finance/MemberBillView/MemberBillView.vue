<template>
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
          single-panel
        />
      </el-form-item>
    </QueryBar>
    <section class="bill-section">
      <h2 class="bill-section-title">流水明细</h2>
      <div v-if="isEmpty(billList)" class="record-empty">暂无数据</div>
      <div v-else class="bill-list">
        <article v-for="billRow in billList" :key="billRow.billNo" class="bill-item">
          <div class="bill-item-top">
            <div class="bill-item-main">
              <div class="bill-item-title">{{ displayText(billRow.shopName) }} · {{ displayText(billRow.username) }}</div>
              <div class="bill-item-sub">
                <el-tag :type="billAmountTagType(billRow.direction)" effect="plain">{{ statusLabel(billRow.direction) }}</el-tag>
                <span>{{ statusLabel(billRow.bizType) }}</span>
                <span>{{ formatLocalDateTime(billRow.createdAt) }}</span>
              </div>
            </div>
            <div class="bill-item-amount" :class="billAmountClass(billRow.direction)">{{ formatBillAmount(billRow) }}</div>
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
import { FinanceApi } from '../../../api/finance';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import ListPager from '../../../components/ListPager/ListPager.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
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

const route = useRoute();
const keyword = ref('');
const bizType = ref('');
const bizTypeOptions = Object.values(FinanceBizType);
const billDateRange = ref<[string, string] | null>(currentMonthDateRange());
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
 * 收入用绿色，支出用红色。方向按会员余额。
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
 * 会员收入金额前加正号，会员支出前加负号。
 */
function formatBillAmount(billRow: BillRow): string {
  if (billRow.direction === FinanceDirection.IN) {
    return `+${billRow.amount}`;
  }
  if (billRow.direction === FinanceDirection.OUT) {
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
 * 查询已绑定门店的会员流水。不按门店筛选。
 */
async function loadBills(): Promise<void> {
  const billDateQuery = readBillDateQuery();
  try {
    const pageResult = (await http.get(FinanceApi.BILLS, {
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
 * 从第一页重新查询流水。
 */
function searchBills(): void {
  page.value = PageSetting.DEFAULT_PAGE;
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
  const keywordFromQuery = route.query.keyword;
  if (typeof keywordFromQuery === 'string' && isEmpty(keywordFromQuery) !== true) {
    keyword.value = keywordFromQuery;
  }
  void loadBills();
});
</script>

<style scoped>
.bill-date-range {
  width: 260px;
  max-width: 100%;
}

.bill-section-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
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
