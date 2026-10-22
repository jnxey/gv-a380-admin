<template>
  <ShopSwitcher />
  <el-card>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(orderList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="orderRow in orderList" :key="orderRow.bookingOrderId">
        <RecordField label="订单号">{{ orderRow.orderNo }}</RecordField>
        <RecordField label="用户名">{{ orderGuestText(orderRow) }}</RecordField>
        <RecordField label="预定人">{{ orderRow.guestName }}</RecordField>
        <RecordField label="联系方式">{{ orderRow.contact }}</RecordField>
        <RecordField label="房型">{{ orderRow.typeName }}</RecordField>
        <RecordField label="房间">{{ orderRow.roomNo }}</RecordField>
        <RecordField label="入住日">{{ formatLocalDateTime(orderRow.checkInDate) }}</RecordField>
        <RecordField label="离店日">{{ formatLocalDateTime(orderRow.checkOutDate) }}</RecordField>
        <RecordField label="房费">{{ orderRow.amount }}</RecordField>
        <RecordField label="状态">{{ statusLabel(orderRow.orderStatus) }}</RecordField>
        <RecordField v-if="canCheckIn && orderRow.orderStatus === HotelOrderStatus.BOOKED" label="入住房间">
          <el-select
            :model-value="selectedRoomIdFor(orderRow.bookingOrderId)"
            placeholder="选择空闲房间"
            style="width: 180px"
            @update:model-value="setSelectedRoomId(orderRow.bookingOrderId, $event)"
          >
            <el-option v-for="room in idleRoomListFor(orderRow)" :key="room.id" :label="room.roomNo" :value="room.id" />
          </el-select>
        </RecordField>
        <template #actions>
          <el-button v-if="canCheckIn && orderRow.orderStatus === HotelOrderStatus.BOOKED" link type="primary" @click="openCheckIn(orderRow)">办理入住</el-button>
          <el-button v-if="canCancel && orderRow.orderStatus === HotelOrderStatus.BOOKED" link type="danger" @click="cancelOrder(orderRow.bookingOrderId)">取消</el-button>
          <el-button v-if="canExtend && orderRow.orderStatus === HotelOrderStatus.CHECKED_IN" link type="primary" @click="openExtend(orderRow)">续住</el-button>
          <el-button v-if="canCheckOut && orderRow.orderStatus === HotelOrderStatus.CHECKED_IN" link type="primary" @click="checkOut(orderRow.bookingOrderId)">退房</el-button>
        </template>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="checkInVisible" title="办理入住" width="420px">
      <template v-if="isEmpty(activeOrderRow) !== true">
        <RecordField label="房间">{{ confirmRoomNo }}</RecordField>
        <RecordField label="预定人">{{ activeOrderRow.guestName }}</RecordField>
        <RecordField label="联系方式">{{ activeOrderRow.contact }}</RecordField>
        <RecordField label="房型">{{ activeOrderRow.typeName }}</RecordField>
        <RecordField label="入住日">{{ formatLocalDateTime(activeOrderRow.checkInDate) }}</RecordField>
        <RecordField label="离店日">{{ formatLocalDateTime(activeOrderRow.checkOutDate) }}</RecordField>
      </template>
      <template #footer>
        <el-button size="large" @click="checkInVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="submitCheckIn">确认入住</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="extendVisible" title="续住" width="420px">
      <el-date-picker v-model="extendDate" type="date" value-format="YYYY-MM-DD" placeholder="新的离店日期" />
      <template #footer>
        <el-button size="large" @click="extendVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="submitExtend">确认续住</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
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

interface RoomRow {
  id: string;
  roomNo: string;
  roomTypeId: string;
  roomStatus: string;
}

const sessionStore = useSessionStore();
const canCheckIn = sessionStore.hasPermission(PermissionCode.HOTEL_STAY_CHECK_IN);
const canExtend = sessionStore.hasPermission(PermissionCode.HOTEL_STAY_EXTEND);
const canCheckOut = sessionStore.hasPermission(PermissionCode.HOTEL_STAY_CHECK_OUT);
const canCancel = sessionStore.hasPermission(PermissionCode.HOTEL_ORDER_CANCEL);
const orderList = ref<OrderRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);
const checkInVisible = ref(false);
const extendVisible = ref(false);
const activeOrderId = ref('');
const activeOrderRow = ref<OrderRow | null>(null);
const selectedRoomId = ref('');
const confirmRoomNo = ref('');
const extendDate = ref('');
const idleRoomList = ref<RoomRow[]>([]);
const selectedRoomIdByOrder = ref<Record<string, string>>({});

/**
 * 订单上的客人。有会员用户名用用户名，现场入住没有会员时用联系方式。
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
  const pageResult = (await http.get('/a380/hotel/booking-orders', {
    params: { page: page.value, pageSize: pageSize.value },
  })) as { list: OrderRow[]; total: number };
  orderList.value = pageResult.list;
  total.value = pageResult.total;
  await loadIdleRooms();
}

/**
 * 读取当前门店空闲房间，供各订单在页面上选择。
 */
async function loadIdleRooms(): Promise<void> {
  const pageResult = (await http.get('/a380/hotel/rooms', {
    params: {
      roomStatus: HotelRoomStatus.IDLE,
      page: PageSetting.DEFAULT_PAGE,
      pageSize: PageSetting.ROOM_LOOKUP_PAGE_SIZE,
    },
  })) as { list: RoomRow[] };
  idleRoomList.value = isEmpty(pageResult.list) ? [] : pageResult.list;
}

/**
 * 这张订单同房型的空闲房间。
 */
function idleRoomListFor(orderRow: OrderRow): RoomRow[] {
  return idleRoomList.value.filter((room) => room.roomTypeId === orderRow.roomTypeId);
}

/**
 * 这张订单已经选中的房间。还没选时为空。
 */
function selectedRoomIdFor(bookingOrderId: string): string {
  const roomId = selectedRoomIdByOrder.value[bookingOrderId];
  return isEmpty(roomId) ? '' : roomId;
}

/**
 * 记下这张订单选中的空闲房间。
 */
function setSelectedRoomId(bookingOrderId: string, roomId: string): void {
  selectedRoomIdByOrder.value = {
    ...selectedRoomIdByOrder.value,
    [bookingOrderId]: roomId,
  };
}

/**
 * 打开入住确认。房间已在页面上选好。
 */
function openCheckIn(orderRow: OrderRow): void {
  const roomId = selectedRoomIdFor(orderRow.bookingOrderId);
  const room = idleRoomList.value.find((item) => item.id === roomId);
  if (isEmpty(roomId) || isEmpty(room)) {
    ElMessage.warning('请选择空闲房间');
    return;
  }
  activeOrderId.value = orderRow.bookingOrderId;
  activeOrderRow.value = orderRow;
  selectedRoomId.value = room.id;
  confirmRoomNo.value = room.roomNo;
  checkInVisible.value = true;
}

/**
 * 确认入住。
 */
async function submitCheckIn(): Promise<void> {
  if (isEmpty(selectedRoomId.value)) {
    ElMessage.warning('请选择空闲房间');
    return;
  }
  await http.post(`\/a380/hotel/booking-orders/${activeOrderId.value}/check-in`, { roomId: selectedRoomId.value });
  ElMessage.success('已入住');
  checkInVisible.value = false;
  const checkedInOrderId = activeOrderId.value;
  selectedRoomIdByOrder.value = {
    ...selectedRoomIdByOrder.value,
    [checkedInOrderId]: '',
  };
  await loadOrders();
}

/**
 * 打开续住弹窗，并默认选中当前离店日。
 */
function openExtend(orderRow: OrderRow): void {
  activeOrderId.value = orderRow.bookingOrderId;
  if (isEmpty(orderRow.checkOutDate)) {
    extendDate.value = '';
  } else {
    extendDate.value = orderRow.checkOutDate.slice(0, 10);
  }
  extendVisible.value = true;
}

/**
 * 确认续住。新的离店日必须晚于当前离店日，此时不扣款。
 */
async function submitExtend(): Promise<void> {
  if (isEmpty(extendDate.value)) {
    ElMessage.warning('请选择新的离店日期');
    return;
  }
  await http.post(`\/a380/hotel/booking-orders/${activeOrderId.value}/extend`, { checkOutDate: extendDate.value });
  ElMessage.success('已续住');
  extendVisible.value = false;
  await loadOrders();
}

/**
 * 退房。不扣房费。
 */
async function checkOut(bookingOrderId: string): Promise<void> {
  await ElMessageBox.confirm('确认退房？', '退房');
  await http.post(`\/a380/hotel/booking-orders/${bookingOrderId}/check-out`);
  ElMessage.success('已退房');
  await loadOrders();
}

/**
 * 取消未入住订单。
 */
async function cancelOrder(bookingOrderId: string): Promise<void> {
  await ElMessageBox.confirm('确认取消该预订？', '取消订单');
  await http.post(`\/a380/hotel/booking-orders/${bookingOrderId}/cancel`);
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
