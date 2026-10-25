<template>
  <ShopSwitcher />
  <el-card>
    <QueryBar @search="searchSales" @reset="resetQuery">
      <el-form-item>
        <el-button-group class="order-date-quick">
          <el-button @click="applyQuickDate('today')">今天</el-button>
          <el-button @click="applyQuickDate('last7')">近7天</el-button>
          <el-button @click="applyQuickDate('month')">本月</el-button>
        </el-button-group>
      </el-form-item>
      <el-form-item>
        <el-date-picker
          v-model="orderDateRange"
          class="order-date-range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          single-panel
        />
      </el-form-item>
    </QueryBar>
    <div v-if="isEmpty(saleList)" class="record-empty">暂无数据</div>
    <div v-else class="sale-list">
      <article v-for="saleRow in saleList" :key="saleRow.saleId" class="sale-card">
        <div class="sale-top">
          <div>
            <div class="sale-no">{{ saleRow.saleNo }}</div>
            <div class="sale-meta">
              {{ statusLabel(saleRow.saleStatus) }}
              · {{ statusLabel(saleRow.payMethod) }}
              <template v-if="isEmpty(saleRow.username) !== true"> · {{ saleRow.username }}</template>
              · {{ formatLocalDateTime(saleRow.createdAt) }}
            </div>
          </div>
          <div class="sale-amount">{{ saleRow.amount }}</div>
        </div>
        <div v-for="itemRow in saleRow.itemList" :key="`${saleRow.saleId}-${itemRow.productId}`" class="sale-item">
          {{ itemRow.productName }} × {{ itemRow.quantity }} · {{ itemRow.salePrice }} · {{ itemRow.lineAmount }}
        </div>
        <div v-if="isEmpty(saleRow.receiverName) !== true" class="sale-meta">收货人 {{ saleRow.receiverName }}</div>
        <div v-if="isEmpty(saleRow.contact) !== true" class="sale-meta">联系方式 {{ saleRow.contact }}</div>
        <div v-if="isEmpty(saleRow.deliveryAddress) !== true" class="sale-meta">收货地址 {{ saleRow.deliveryAddress }}</div>
        <div v-if="isEmpty(saleRow.courierName) !== true" class="sale-meta">送货人 {{ saleRow.courierName }}</div>
        <div v-if="isEmpty(saleRow.courierContact) !== true" class="sale-meta">送货联系方式 {{ saleRow.courierContact }}</div>
        <div v-if="isEmpty(saleRow.deliveryNo) !== true" class="sale-meta">送货号 {{ saleRow.deliveryNo }}</div>
        <div v-if="isEmpty(saleRow.deliveryRemark) !== true" class="sale-meta">送货备注 {{ saleRow.deliveryRemark }}</div>
        <div v-if="isEmpty(saleRow.remark) !== true" class="sale-meta">备注 {{ saleRow.remark }}</div>
      </article>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
  </el-card>
</template>

<script setup lang="ts">
import { StoreApi } from '../../../api/store';
import { onMounted, ref } from 'vue';
import ListPager from '../../../components/ListPager/ListPager.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import { PageSetting, statusLabel } from '../../../utils/constants';
import { formatLocalDateTime, isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

interface SaleItemRow {
  productId: string;
  productName: string;
  salePrice: string;
  quantity: number;
  lineAmount: string;
}

interface SaleRow {
  saleId: string;
  saleNo: string;
  username: string;
  payMethod: string;
  saleStatus: string;
  amount: string;
  remark: string;
  receiverName: string;
  contact: string;
  deliveryAddress: string;
  courierName: string;
  courierContact: string;
  deliveryNo: string;
  deliveryRemark: string;
  createdAt: string;
  itemList: SaleItemRow[];
}

const saleList = ref<SaleRow[]>([]);
const total = ref(0);
const page = ref(PageSetting.DEFAULT_PAGE);
const pageSize = ref(PageSetting.DEFAULT_PAGE_SIZE);
const orderDateRange = ref<[string, string] | null>(null);
const appliedStartDate = ref('');
const appliedEndDate = ref('');

/**
 * 日期数字补成两位。
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
 * 本月 1 日到今天。
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
function readOrderDateQuery(): { startDate: string; endDate: string } {
  if (isEmpty(orderDateRange.value)) {
    return { startDate: '', endDate: '' };
  }
  return {
    startDate: orderDateRange.value[0],
    endDate: orderDateRange.value[1],
  };
}

/**
 * 点快捷日期后立刻按新范围查询。
 */
function applyQuickDate(quickDateKind: 'today' | 'last7' | 'month'): void {
  if (quickDateKind === 'today') {
    orderDateRange.value = todayDateRange();
  } else if (quickDateKind === 'last7') {
    orderDateRange.value = last7DaysDateRange();
  } else {
    orderDateRange.value = currentMonthDateRange();
  }
  searchSales();
}

/**
 * 分页查询销售单。
 */
async function loadSales(): Promise<void> {
  const pageResult = (await http.get(StoreApi.SALES, {
    params: {
      page: page.value,
      pageSize: pageSize.value,
      startDate: appliedStartDate.value,
      endDate: appliedEndDate.value,
    },
  })) as { list: SaleRow[]; total: number };
  saleList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 应用时间筛选后从第 1 页查。
 */
function searchSales(): void {
  const orderDateQuery = readOrderDateQuery();
  appliedStartDate.value = orderDateQuery.startDate;
  appliedEndDate.value = orderDateQuery.endDate;
  page.value = PageSetting.DEFAULT_PAGE;
  void loadSales();
}

/**
 * 清空时间筛选后重新查。
 */
function resetQuery(): void {
  orderDateRange.value = null;
  appliedStartDate.value = '';
  appliedEndDate.value = '';
  page.value = PageSetting.DEFAULT_PAGE;
  void loadSales();
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadSales();
}

onMounted(() => {
  void loadSales();
});
</script>

<style scoped>
.order-date-range {
  --el-date-editor-daterange-width: 260px;
}

.sale-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sale-card {
  padding: 14px;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #fff;
}

.sale-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.sale-no {
  font-weight: 600;
  color: #1c2434;
}

.sale-amount {
  font-size: 18px;
  font-weight: 600;
}

.sale-meta,
.sale-item {
  margin-top: 4px;
  color: #667085;
  font-size: 13px;
}

.record-empty {
  padding: 32px 0;
  text-align: center;
  color: #98a2b3;
}
</style>
