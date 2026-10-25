<template>
  <ShopSwitcher />
  <el-card>
    <QueryBar @search="searchOrders" @reset="resetQuery">
      <el-form-item>
        <el-input v-model="contactKeyword" v-place class="query-keyword" placeholder="联系方式" clearable />
      </el-form-item>
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
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(orderList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="orderRow in orderList" :key="orderRow.bookingOrderId">
        <RecordField label="订单号">{{ orderRow.orderNo }}</RecordField>
        <RecordField label="账号">{{ orderRow.username }}</RecordField>
        <RecordField label="联系方式">{{ orderRow.contact }}</RecordField>
        <RecordField label="类型">{{ orderRow.roomTypeName }}</RecordField>
        <RecordField label="包厢">{{ orderRow.roomName }}</RecordField>
        <RecordField label="日期">{{ formatLocalDateTime(orderRow.bookingDate) }}</RecordField>
        <RecordField label="开始">{{ formatLocalDateTime(orderRow.startTime) }}</RecordField>
        <RecordField label="小时">{{ orderRow.durationHours }}</RecordField>
        <RecordField label="结束">{{ formatBookingEnd(orderRow) }}</RecordField>
        <RecordField label="包厢费">{{ orderRow.amount }}</RecordField>
        <RecordField label="核销码">{{ VerifyCodeMask }}</RecordField>
        <RecordField label="状态">{{ statusLabel(orderRow.orderStatus) }}</RecordField>
        <template #actions>
          <el-button v-if="canVerify && orderRow.orderStatus === KtvOrderStatus.PENDING_VERIFY" link type="primary" @click="openVerify(orderRow.bookingOrderId)">核销</el-button>
          <el-button
            v-if="canCancel && orderRow.orderStatus === KtvOrderStatus.PENDING_PAY"
            link
            type="danger"
            @click="cancelOrder(orderRow.bookingOrderId, false)"
          >
            取消
          </el-button>
          <el-button
            v-if="canCancel && orderRow.orderStatus === KtvOrderStatus.PENDING_VERIFY"
            link
            type="danger"
            @click="cancelOrder(orderRow.bookingOrderId, true)"
          >
            取消
          </el-button>
        </template>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="verifyVisible" title="分配包厢" width="420px">
      <div v-if="isEmpty(freeRoomList)" class="record-empty">该时段没有空闲包厢</div>
      <el-form v-else label-position="top">
        <el-form-item label="包厢">
          <el-select v-model="verifyRoomId">
            <el-option v-for="room in freeRoomList" :key="room.id" :label="room.roomName" :value="room.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="verifyVisible = false">取消</el-button>
        <el-button size="large" type="primary" :disabled="isEmpty(freeRoomList)" @click="submitVerify">确认核销</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { KtvApi } from '../../../api/ktv';
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { KtvOrderStatus, PageSetting, PermissionCode, VerifyCodeMask, statusLabel } from '../../../utils/constants';
import { isEmpty, formatLocalDateTime } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface FreeRoom {
  id: string;
  roomName: string;
}

interface OrderRow {
  bookingOrderId: string;
  orderNo: string;
  username: string;
  contact: string;
  roomTypeName: string;
  roomName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  amount: string;
  verifyCode: string;
  orderStatus: string;
}

const sessionStore = useSessionStore();
const canVerify = sessionStore.hasPermission(PermissionCode.KTV_ORDER_VERIFY);
const canCancel = sessionStore.hasPermission(PermissionCode.KTV_ORDER_CANCEL);
const contactKeyword = ref('');
const orderDateRange = ref<[string, string] | null>(null);
const appliedStartDate = ref('');
const appliedEndDate = ref('');
const orderList = ref<OrderRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);
const verifyVisible = ref(false);
const verifyOrderId = ref('');
const verifyRoomId = ref('');
const freeRoomList = ref<FreeRoom[]>([]);

/**
 * 结束钟点不晚于开唱钟点时，表示已经跨到第二天。
 */
function formatBookingEnd(orderRow: OrderRow): string {
  const endTimeText = formatLocalDateTime(orderRow.endTime);
  if (orderRow.endTime <= orderRow.startTime) {
    return `次日 ${endTimeText}`;
  }
  return endTimeText;
}

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
  searchOrders();
}

/**
 * 查询当前门店预订订单。
 */
async function loadOrders(): Promise<void> {
  const pageResult = (await http.get(KtvApi.BOOKING_ORDERS, {
    params: {
      contact: contactKeyword.value,
      page: page.value,
      pageSize: pageSize.value,
      startDate: appliedStartDate.value,
      endDate: appliedEndDate.value,
    },
  })) as { list: OrderRow[]; total: number };
  orderList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 打开核销弹窗，并加载该时段还能分配的包厢。
 */
async function openVerify(bookingOrderId: string): Promise<void> {
  verifyOrderId.value = bookingOrderId;
  verifyRoomId.value = '';
  freeRoomList.value = (await http.get(KtvApi.bookingOrderFreeRooms(bookingOrderId))) as FreeRoom[];
  if (isEmpty(freeRoomList.value) !== true) {
    verifyRoomId.value = freeRoomList.value[0].id;
  }
  verifyVisible.value = true;
}

/**
 * 把选中的空闲包厢写入订单并核销。
 */
async function submitVerify(): Promise<void> {
  if (isEmpty(verifyRoomId.value)) {
    ElMessage.warning('该时段没有空闲包厢');
    return;
  }
  await http.post(KtvApi.bookingOrderVerify(verifyOrderId.value), {
    roomId: verifyRoomId.value,
  });
  ElMessage.success('核销成功');
  verifyVisible.value = false;
  await loadOrders();
}

/**
 * 取消订单。已支付的待核销会退回包厢费；待支付只关单。
 */
async function cancelOrder(bookingOrderId: string, needRefund: boolean): Promise<void> {
  await ElMessageBox.confirm(needRefund ? '确认取消并退款？' : '确认取消该待支付订单？', '取消订单');
  await http.post(KtvApi.bookingOrderCancel(bookingOrderId));
  ElMessage.success(needRefund ? '已退款' : '已取消');
  await loadOrders();
}

/**
 * 从第一页重新查询。
 */
function searchOrders(): void {
  const orderDateQuery = readOrderDateQuery();
  appliedStartDate.value = orderDateQuery.startDate;
  appliedEndDate.value = orderDateQuery.endDate;
  page.value = PageSetting.DEFAULT_PAGE;
  void loadOrders();
}

/**
 * 清空联系方式和时间筛选，并回到第一页。
 */
function resetQuery(): void {
  contactKeyword.value = '';
  orderDateRange.value = null;
  appliedStartDate.value = '';
  appliedEndDate.value = '';
  page.value = PageSetting.DEFAULT_PAGE;
  void loadOrders();
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadOrders();
}

onMounted(() => {
  void loadOrders();
});
</script>

<style scoped>
.order-date-range {
  --el-date-editor-daterange-width: 260px;
}

@media (min-width: 1200px) {
  .record-list--wide-table :deep(.record-actions) {
    width: 188px;
    white-space: nowrap;
  }
}
</style>

