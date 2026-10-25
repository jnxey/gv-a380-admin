<template>
  <ShopSwitcher />
  <el-card>
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
 * 查询当前酒店订单。
 */
async function loadOrders(): Promise<void> {
  const pageResult = (await http.get(HotelApi.BOOKING_ORDERS, {
    params: { page: page.value, pageSize: pageSize.value },
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
