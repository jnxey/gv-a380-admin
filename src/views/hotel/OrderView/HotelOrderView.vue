<template>
  <ShopSwitcher />
  <el-card>
    <QueryBar @search="searchOrders" @reset="resetQuery">
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
        <RecordField label="账号">{{ orderGuestText(orderRow) }}</RecordField>
        <RecordField label="预订人">{{ orderRow.guestName }}</RecordField>
        <RecordField label="联系方式">{{ orderRow.contact }}</RecordField>
        <RecordField label="房型">{{ orderRow.typeName }}</RecordField>
        <RecordField label="房间">{{ orderRow.roomNo }}</RecordField>
        <RecordField label="入住日">{{ formatLocalDateTime(orderRow.checkInDate) }}</RecordField>
        <RecordField label="离店日">{{ formatLocalDateTime(orderRow.checkOutDate) }}</RecordField>
        <RecordField label="房费">{{ orderRow.amount }}</RecordField>
        <RecordField label="状态">{{ statusLabel(orderRow.orderStatus) }}</RecordField>
        <template #actions>
          <el-button
            v-if="canCancel && (orderRow.orderStatus === HotelOrderStatus.PENDING_PAY || orderRow.orderStatus === HotelOrderStatus.BOOKED)"
            link
            type="danger"
            @click="cancelOrder(orderRow.bookingOrderId)"
          >
            取消
          </el-button>
          <el-button v-if="canExtend && orderRow.orderStatus === HotelOrderStatus.CHECKED_IN" link type="primary" @click="openExtend(orderRow)">续住</el-button>
          <el-button v-if="canCheckOut && orderRow.orderStatus === HotelOrderStatus.CHECKED_IN" link type="primary" @click="checkOut(orderRow.bookingOrderId)">退房</el-button>
        </template>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <ExtendStayDialog
      v-model="extendVisible"
      v-model:extend-date="extendDate"
      :room="extendingRoom"
      :room-meta="extendRoomMeta"
      :booking-order-id="extendingBookingOrderId"
      @saved="onExtendSaved"
    />
  </el-card>
</template>

<script setup lang="ts">
import { HotelApi } from '../../../api/hotel';
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import ExtendStayDialog, { type ExtendStayRoomRow } from '../RoomStatusView/components/ExtendStayDialog.vue';
import { HotelOrderStatus, HotelRoomStatus, PageSetting, PermissionCode, statusLabel } from '../../../utils/constants';
import { isEmpty, formatLocalDateTime } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface OrderRow {
  bookingOrderId: string;
  orderNo: string;
  username: string;
  contact: string;
  guestName: string;
  typeName: string;
  roomTypeId: string;
  roomNo: string;
  checkInDate: string;
  checkOutDate: string;
  amount: string;
  orderStatus: string;
}

const sessionStore = useSessionStore();
const canExtend = sessionStore.hasPermission(PermissionCode.HOTEL_STAY_EXTEND);
const canCheckOut = sessionStore.hasPermission(PermissionCode.HOTEL_STAY_CHECK_OUT);
const canCancel = sessionStore.hasPermission(PermissionCode.HOTEL_ORDER_CANCEL);
const orderList = ref<OrderRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);
const orderDateRange = ref<[string, string] | null>(null);
const appliedStartDate = ref('');
const appliedEndDate = ref('');
const extendVisible = ref(false);
const extendingOrder = ref<OrderRow | null>(null);
const extendDate = ref('');

/**
 * 续住弹窗对应的订单主键。
 */
const extendingBookingOrderId = computed(() => {
  if (isEmpty(extendingOrder.value)) {
    return '';
  }
  return extendingOrder.value.bookingOrderId;
});

/**
 * 续住弹窗顶部房间信息。在住订单按在住房态展示。
 */
const extendingRoom = computed((): ExtendStayRoomRow | null => {
  if (isEmpty(extendingOrder.value)) {
    return null;
  }
  return {
    id: extendingOrder.value.bookingOrderId,
    roomNo: isEmpty(extendingOrder.value.roomNo) ? '—' : extendingOrder.value.roomNo,
    roomStatus: HotelRoomStatus.OCCUPIED,
  };
});

/**
 * 续住弹窗里的客人和离店日。
 */
const extendRoomMeta = computed(() => {
  if (isEmpty(extendingOrder.value)) {
    return '';
  }
  const guestName = isEmpty(extendingOrder.value.guestName) ? orderGuestText(extendingOrder.value) : extendingOrder.value.guestName;
  const checkOutText = isEmpty(extendingOrder.value.checkOutDate) ? '' : `${formatLocalDateTime(extendingOrder.value.checkOutDate)} 离店`;
  if (isEmpty(guestName)) {
    return checkOutText;
  }
  if (isEmpty(checkOutText)) {
    return guestName;
  }
  return `${guestName} · ${checkOutText}`;
});

/**
 * 订单上的客人。有会员账号用账号，现场入住没有会员时用联系方式。
 */
function orderGuestText(orderRow: OrderRow): string {
  if (isEmpty(orderRow.username) !== true) {
    return orderRow.username;
  }
  return isEmpty(orderRow.contact) ? '' : orderRow.contact;
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
 * 查询当前酒店订单。
 */
async function loadOrders(): Promise<void> {
  const pageResult = (await http.get(HotelApi.BOOKING_ORDERS, {
    params: {
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
 * 打开续住弹窗，并默认选中当前离店日。
 */
function openExtend(orderRow: OrderRow): void {
  extendingOrder.value = orderRow;
  if (isEmpty(orderRow.checkOutDate)) {
    extendDate.value = '';
  } else {
    extendDate.value = orderRow.checkOutDate.slice(0, 10);
  }
  extendVisible.value = true;
}

/**
 * 续住成功后刷新列表。
 */
async function onExtendSaved(): Promise<void> {
  extendingOrder.value = null;
  await loadOrders();
}

/**
 * 退房。不扣房费。
 */
async function checkOut(bookingOrderId: string): Promise<void> {
  await ElMessageBox.confirm('确认退房？', '退房');
  await http.post(HotelApi.bookingOrderCheckOut(bookingOrderId));
  ElMessage.success('已退房');
  await loadOrders();
}

/**
 * 取消未入住订单。
 */
async function cancelOrder(bookingOrderId: string): Promise<void> {
  await ElMessageBox.confirm('确认取消该预订？', '取消订单');
  await http.post(HotelApi.bookingOrderCancel(bookingOrderId));
  ElMessage.success('已取消');
  await loadOrders();
}

/**
 * 应用时间筛选后从第 1 页查。
 */
function searchOrders(): void {
  const orderDateQuery = readOrderDateQuery();
  appliedStartDate.value = orderDateQuery.startDate;
  appliedEndDate.value = orderDateQuery.endDate;
  page.value = PageSetting.DEFAULT_PAGE;
  void loadOrders();
}

/**
 * 清空时间筛选后重新查。
 */
function resetQuery(): void {
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
</style>
