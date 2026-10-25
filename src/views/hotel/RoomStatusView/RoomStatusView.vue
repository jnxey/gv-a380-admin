<template>
  <div class="room-status-page" @pointerdown="preparePaymentAudio">
    <ShopSwitcher />
    <el-card class="room-status-main">
      <RoomStatusSummary :count-list="roomStatusCountList" @deduct="deductVisible = true" @refresh="reloadPage" />
      <CheckInBar
        v-if="canCheckIn"
        v-model:contact="checkInContact"
        v-model:selected-order-id="selectedOrderId"
        v-model:walk-in-night-choice="walkInNightChoice"
        v-model:walk-in-custom-night-count="walkInCustomNightCount"
        :searched="checkInSearched"
        :today-booking-list="todayBookingList"
        :selected-today-order="selectedTodayOrder"
        :selected-room-id="selectedCheckInRoomId"
        :walk-in-check-in-date-text="walkInCheckInDateText"
        @search="searchTodayBooking"
        @clear="clearCheckInSearch"
        @confirm="openCheckInConfirm(null)"
      />
      <div class="room-status-body">
        <div class="room-status-rooms">
          <template v-if="canCheckIn && checkInSearched">
            <h3 class="room-status-pick-title">{{ checkInPickTitle }}</h3>
            <div v-if="todayBookingList.length > 0 && isEmpty(selectedTodayOrder)" class="room-status-empty">请先选择今天的预定</div>
            <div v-else-if="checkInRoomList.length === 0" class="room-status-empty">没有可入住房间</div>
            <div v-else class="room-status-grid">
              <RoomStatusPickCard
                v-for="roomRow in checkInRoomList"
                :key="roomRow.id"
                :room="roomRow"
                :type-name="roomTypeName(roomRow.roomTypeId)"
                :night-price="roomNightPrice(roomRow.roomTypeId)"
                :selected="roomRow.id === selectedCheckInRoomId"
                @select="selectCheckInRoom(roomRow)"
              />
            </div>
          </template>
          <template v-else>
            <div v-if="roomFloorGroupList.length === 0" class="room-status-empty">暂无数据</div>
            <section v-for="roomFloorGroup in roomFloorGroupList" :key="roomFloorGroup.floorNo" class="room-status-group">
              <h3 class="room-status-group-title">{{ roomFloorGroup.floorNo }}层</h3>
              <div class="room-status-grid">
                <RoomStatusCard
                  v-for="roomRow in roomFloorGroup.roomList"
                  :key="roomRow.id"
                  :room="roomRow"
                  :type-name="roomTypeName(roomRow.roomTypeId)"
                  :night-price="roomNightPrice(roomRow.roomTypeId)"
                  :guest-name="roomGuestName(roomRow)"
                  :check-out-text="roomCheckOutText(roomRow)"
                  :can-save="canSave"
                  :can-extend="canExtend"
                  :can-check-out="canCheckOut"
                  @finish-cleaning="finishCleaning(roomRow)"
                  @extend="showExtend(roomRow)"
                  @check-out="checkOut(roomRow)"
                  @change-status="(roomStatus) => changeRoomStatus(roomRow, roomStatus)"
                />
              </div>
            </section>
          </template>
        </div>
        <RoomStatusOrdersAside
          :booked-order-list="bookedOrderList"
          :booked-type-count-list="bookedTypeCountList"
          :room-type-warning-list="roomTypeWarningList"
          :can-check-in="canCheckIn"
          @handle="startCheckInFromOrder"
        />
      </div>
      <el-dialog v-model="deductVisible" title="付款" :width="deductDialogWidth" :trap-focus="false" destroy-on-close @opened="focusDeductAmount">
        <DeductView ref="deductView" @close="deductVisible = false" />
      </el-dialog>
      <CheckInDialog
        v-model="checkInVisible"
        :room="openingRoom"
        :today-order="selectedTodayOrder"
        :searched-contact="searchedContact"
        :walk-in-check-in-date-text="walkInCheckInDateText"
        :walk-in-night-count-text="walkInNightCountText"
        :walk-in-night-count="resolveWalkInNightCount()"
        :type-name="isEmpty(openingRoom) ? '' : roomTypeName(openingRoom.roomTypeId)"
        :night-price="isEmpty(openingRoom) ? '' : roomNightPrice(openingRoom.roomTypeId)"
        @saved="onCheckInSaved"
      />
      <ExtendStayDialog
        v-model="extendVisible"
        v-model:extend-date="extendDate"
        :room="extendingRoom"
        :room-meta="extendRoomMeta(extendingRoom)"
        :booking-order-id="extendingBookingOrderId"
        @saved="onExtendSaved"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { HotelApi } from '../../../api/hotel';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import DeductView from '../DeductView/DeductView.vue';
import CheckInBar from './components/CheckInBar.vue';
import CheckInDialog from './components/CheckInDialog.vue';
import ExtendStayDialog from './components/ExtendStayDialog.vue';
import RoomStatusCard from './components/RoomStatusCard.vue';
import RoomStatusOrdersAside from './components/RoomStatusOrdersAside.vue';
import RoomStatusPickCard from './components/RoomStatusPickCard.vue';
import RoomStatusSummary from './components/RoomStatusSummary.vue';
import { useHotelRoomStatusRefresh } from './utils/hotel-room-status-refresh';
import { usePaymentNotice } from '../../../hooks/payment-notice';
import { HotelBusinessDay, HotelOrderStatus, HotelRoomStatus, HotelWalkInNight, PageSetting, PermissionCode, statusLabel } from '../../../utils/constants';
import { hotelBusinessDateText } from './utils/hotel-business-date';
import { buildHotelRoomTypeWarningList } from './utils/hotel-room-type-warning';
import { formatLocalDateTime, isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface RoomRow {
  id: string;
  roomNo: string;
  floorNo: string;
  roomTypeId: string;
  roomStatus: string;
}

interface RoomTypeRow {
  id: string;
  typeName: string;
  price: string;
}

interface OrderRow {
  bookingOrderId: string;
  username: string;
  contact: string;
  guestName: string;
  roomTypeId: string;
  typeName: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  orderStatus: string;
}

interface RoomFloorGroup {
  floorNo: string;
  roomList: RoomRow[];
}

const sessionStore = useSessionStore();
const canCheckIn = sessionStore.hasPermission(PermissionCode.HOTEL_STAY_CHECK_IN);
const canExtend = sessionStore.hasPermission(PermissionCode.HOTEL_STAY_EXTEND);
const canCheckOut = sessionStore.hasPermission(PermissionCode.HOTEL_STAY_CHECK_OUT);
const canSave = sessionStore.hasPermission(PermissionCode.HOTEL_ROOM_SAVE);
const { preparePaymentAudio, loadPaymentNotices, stopPaymentAudio } = usePaymentNotice(HotelApi.PAYMENT_NOTICES);
const roomList = ref<RoomRow[]>([]);
const roomTypeList = ref<RoomTypeRow[]>([]);
const orderList = ref<OrderRow[]>([]);
const checkInVisible = ref(false);
const extendVisible = ref(false);
const openingRoom = ref<RoomRow | null>(null);
const extendingRoom = ref<RoomRow | null>(null);
const selectedOrderId = ref('');
const extendDate = ref('');
const checkInContact = ref('');
const searchedContact = ref('');
const checkInSearched = ref(false);
const selectedCheckInRoomId = ref('');
const walkInNightChoice = ref<number | string>(HotelWalkInNight.MIN_COUNT);
const walkInCustomNightCount = ref('');
const deductVisible = ref(false);
const deductView = ref<{ focusAmount: () => void } | null>(null);
const deductDialogWidth = ref('460px');
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');

/**
 * 按楼层把房间分组。楼层按数字从小到大排。
 */
const roomFloorGroupList = computed<RoomFloorGroup[]>(() => {
  const floorNoList: string[] = [];
  roomList.value.forEach((roomRow) => {
    if (floorNoList.includes(roomRow.floorNo) !== true) {
      floorNoList.push(roomRow.floorNo);
    }
  });
  floorNoList.sort((leftFloor, rightFloor) => Number(leftFloor) - Number(rightFloor));
  return floorNoList.map((floorNo) => {
    return {
      floorNo,
      roomList: roomList.value.filter((roomRow) => roomRow.floorNo === floorNo),
    };
  });
});

/**
 * 顶部房态数量。
 */
const roomStatusCountList = computed(() => {
  return [HotelRoomStatus.IDLE, HotelRoomStatus.OCCUPIED, HotelRoomStatus.CLEANING, HotelRoomStatus.MAINTENANCE].map((roomStatus) => {
    return {
      value: roomStatus,
      label: statusLabel(roomStatus),
      count: roomList.value.filter((roomRow) => roomRow.roomStatus === roomStatus).length,
    };
  });
});

/**
 * 侧栏里的已预订订单。
 */
const bookedOrderList = computed(() => {
  return orderList.value.filter((orderRow) => orderRow.orderStatus === HotelOrderStatus.BOOKED);
});

/**
 * 每个房型的已预订单数。没有订单的房型不显示。
 */
const bookedTypeCountList = computed(() => {
  return roomTypeList.value
    .map((roomType) => {
      return {
        roomTypeId: roomType.id,
        typeName: roomType.typeName,
        count: bookedOrderList.value.filter((orderRow) => orderRow.roomTypeId === roomType.id).length,
      };
    })
    .filter((bookedTypeCount) => bookedTypeCount.count > 0);
});

/**
 * 已预订单数接近或超过空闲房间时的提示。
 */
const roomTypeWarningList = computed(() => {
  return buildHotelRoomTypeWarningList(roomTypeList.value, bookedOrderList.value, roomList.value);
});

/**
 * 刚查到的、入住日是门店今天的已预订订单。
 */
const todayBookingList = computed(() => {
  if (checkInSearched.value !== true || isEmpty(searchedContact.value)) {
    return [];
  }
  const todayText = hotelBusinessDateText(new Date(), currentShopTimeZoneOffset());
  return bookedOrderList.value.filter((orderRow) => {
    const contactText = isEmpty(orderRow.contact) ? '' : orderRow.contact.trim();
    const checkInDateText = isEmpty(orderRow.checkInDate) ? '' : orderRow.checkInDate.slice(0, 10);
    return contactText === searchedContact.value && checkInDateText === todayText;
  });
});

/**
 * 办理入住当前选中的今天预定。没选中时为空。
 */
const selectedTodayOrder = computed(() => {
  if (isEmpty(selectedOrderId.value)) {
    return null;
  }
  const orderRow = todayBookingList.value.find((item) => item.bookingOrderId === selectedOrderId.value);
  if (isEmpty(orderRow)) {
    return null;
  }
  return orderRow;
});

/**
 * 对上预定后只列同房型空闲房。没有预定时列出全部空闲房。
 */
const checkInRoomList = computed(() => {
  const idleRoomList = roomList.value.filter((roomRow) => roomRow.roomStatus === HotelRoomStatus.IDLE);
  if (isEmpty(selectedTodayOrder.value) !== true) {
    const roomTypeId = selectedTodayOrder.value.roomTypeId;
    return idleRoomList.filter((roomRow) => roomRow.roomTypeId === roomTypeId);
  }
  if (checkInSearched.value === true && todayBookingList.value.length === 0) {
    return idleRoomList;
  }
  return [];
});

/**
 * 查询后房间区的标题。还没选定预定时先提示选择。
 */
const checkInPickTitle = computed(() => {
  if (isEmpty(selectedTodayOrder.value) !== true) {
    return `可选房间 · ${selectedTodayOrder.value.typeName}`;
  }
  if (todayBookingList.value.length > 0) {
    return '请选择今天的预定';
  }
  return '可选空闲房间';
});

/**
 * 没有预订时页面上显示的入住日。早上切点前仍算前一天。
 */
const walkInCheckInDateText = computed(() => {
  return hotelBusinessDateText(new Date(), currentShopTimeZoneOffset());
});

/**
 * 没有预订时确认弹窗里的晚数。还没填对时为空。
 */
const walkInNightCountText = computed(() => {
  const nightCount = resolveWalkInNightCount();
  if (nightCount === null) {
    return '';
  }
  return String(nightCount);
});

/**
 * 续住弹窗对应的在住订单主键。
 */
const extendingBookingOrderId = computed(() => {
  if (isEmpty(extendingRoom.value)) {
    return '';
  }
  const stayOrder = occupiedOrder(extendingRoom.value);
  if (isEmpty(stayOrder)) {
    return '';
  }
  return stayOrder.bookingOrderId;
});

/**
 * 房型名称。没有房型时为空。
 */
function roomTypeName(roomTypeId: string): string {
  const roomType = roomTypeList.value.find((item) => item.id === roomTypeId);
  if (isEmpty(roomType) || isEmpty(roomType.typeName)) {
    return '';
  }
  return roomType.typeName;
}

/**
 * 房型每晚价格。没有房型时为空。
 */
function roomNightPrice(roomTypeId: string): string {
  const roomType = roomTypeList.value.find((item) => item.id === roomTypeId);
  if (isEmpty(roomType) || isEmpty(roomType.price)) {
    return '';
  }
  return String(roomType.price);
}

/**
 * 找出这间房当前在住的订单。没有时返回空。
 */
function occupiedOrder(roomRow: RoomRow): OrderRow | null {
  const stayOrder = orderList.value.find((orderRow) => {
    return orderRow.roomId === roomRow.id && orderRow.orderStatus === HotelOrderStatus.CHECKED_IN;
  });
  if (isEmpty(stayOrder)) {
    return null;
  }
  return stayOrder;
}

/**
 * 订单上要显示的客人。先用预定人，没有时用账号，再没有用联系方式。
 */
function bookedOrderGuestText(orderRow: OrderRow): string {
  if (isEmpty(orderRow.guestName) !== true) {
    return orderRow.guestName;
  }
  if (isEmpty(orderRow.username) !== true) {
    return orderRow.username;
  }
  return isEmpty(orderRow.contact) ? '' : orderRow.contact;
}

/**
 * 在住客人。先用预定人，没有时用账号，现场入住再用联系方式。
 */
function roomGuestName(roomRow: RoomRow): string {
  const stayOrder = occupiedOrder(roomRow);
  if (isEmpty(stayOrder)) {
    return '';
  }
  return bookedOrderGuestText(stayOrder);
}

/**
 * 卡片上的离店日。不是在住时为空。
 */
function roomCheckOutText(roomRow: RoomRow): string {
  const stayOrder = occupiedOrder(roomRow);
  if (isEmpty(stayOrder)) {
    return '';
  }
  return `${formatLocalDateTime(stayOrder.checkOutDate)} 离店`;
}

/**
 * 续住弹窗里的客人和离店日。
 */
function extendRoomMeta(roomRow: RoomRow | null): string {
  if (isEmpty(roomRow)) {
    return '';
  }
  const guestName = roomGuestName(roomRow);
  const checkOutText = roomCheckOutText(roomRow);
  if (isEmpty(guestName)) {
    return checkOutText;
  }
  if (isEmpty(checkOutText)) {
    return guestName;
  }
  return `${guestName} · ${checkOutText}`;
}

/**
 * 读取当前门店全部房间。
 */
async function loadRooms(): Promise<void> {
  const pageResult = (await http.get(HotelApi.ROOMS)) as { list: RoomRow[] };
  roomList.value = pageResult.list;
}

/**
 * 读取当前门店全部房型。
 */
async function loadRoomTypes(): Promise<void> {
  const pageResult = (await http.get(HotelApi.ROOM_TYPES)) as { list: RoomTypeRow[] };
  roomTypeList.value = pageResult.list;
}

/**
 * 翻页读完当前门店订单，供房间卡片和侧栏对应。
 */
async function loadOrders(): Promise<void> {
  const orderRowList: OrderRow[] = [];
  let pageIndex = PageSetting.DEFAULT_PAGE;
  let totalCount = 0;
  do {
    const pageResult = (await http.get(HotelApi.BOOKING_ORDERS, {
      params: {
        page: pageIndex,
        pageSize: PageSetting.ROOM_LOOKUP_PAGE_SIZE,
      },
    })) as { list: OrderRow[]; total: number };
    totalCount = pageResult.total;
    if (isEmpty(pageResult.list) || pageResult.list.length === 0) {
      break;
    }
    pageResult.list.forEach((orderRow) => {
      orderRowList.push(orderRow);
    });
    pageIndex += 1;
  } while (orderRowList.length < totalCount);
  orderList.value = orderRowList;
}

/**
 * 房间、房型和订单一起刷新。
 */
async function loadPage(): Promise<void> {
  await loadRoomTypes();
  await loadRooms();
  await loadOrders();
}

/**
 * 当前门店时区。没有时区时按东八区。
 */
function currentShopTimeZoneOffset(): string {
  const currentShop = sessionStore.shopList.find((shop) => shop.shopId === sessionStore.currentShopId);
  if (isEmpty(currentShop) || isEmpty(currentShop.timeZone)) {
    return HotelBusinessDay.DEFAULT_TIME_ZONE_OFFSET;
  }
  return currentShop.timeZone;
}

/**
 * 没有预订时实际提交的晚数。预设直接用选项，自定义必须是允许范围内的整数。
 */
function resolveWalkInNightCount(): number | null {
  if (walkInNightChoice.value !== HotelWalkInNight.CUSTOM) {
    return Number(walkInNightChoice.value);
  }
  const nightText = walkInCustomNightCount.value.trim();
  if (isEmpty(nightText)) {
    return null;
  }
  const nightCount = Number(nightText);
  if (Number.isInteger(nightCount) !== true) {
    return null;
  }
  if (nightCount < HotelWalkInNight.MIN_COUNT || nightCount > HotelWalkInNight.MAX_COUNT) {
    return null;
  }
  return nightCount;
}

/**
 * 按联系方式查找门店今天的已预订订单。
 */
function searchTodayBooking(): void {
  const contactText = checkInContact.value.trim();
  if (isEmpty(contactText)) {
    ElMessage.warning('请填写联系方式');
    return;
  }
  checkInContact.value = contactText;
  searchedContact.value = contactText;
  checkInSearched.value = true;
  selectedCheckInRoomId.value = '';
  walkInNightChoice.value = HotelWalkInNight.MIN_COUNT;
  walkInCustomNightCount.value = '';
  const matchedOrderList = todayBookingList.value;
  if (matchedOrderList.length === 1) {
    selectedOrderId.value = matchedOrderList[0].bookingOrderId;
    return;
  }
  selectedOrderId.value = '';
}

/**
 * 用这一单的联系方式查询。今天的结果里有这一单时直接选中。
 */
function startCheckInFromOrder(orderRow: OrderRow): void {
  const contactText = isEmpty(orderRow.contact) ? '' : orderRow.contact.trim();
  if (isEmpty(contactText)) {
    ElMessage.warning('该订单没有联系方式');
    return;
  }
  checkInContact.value = contactText;
  searchTodayBooking();
  const matchedOrder = todayBookingList.value.find((item) => item.bookingOrderId === orderRow.bookingOrderId);
  if (isEmpty(matchedOrder) !== true) {
    selectedOrderId.value = matchedOrder.bookingOrderId;
  }
}

/**
 * 退出这次查询，回到全部房间。联系方式留在输入框里。
 */
function clearCheckInSearch(): void {
  checkInSearched.value = false;
  searchedContact.value = '';
  selectedOrderId.value = '';
  selectedCheckInRoomId.value = '';
  walkInNightChoice.value = HotelWalkInNight.MIN_COUNT;
  walkInCustomNightCount.value = '';
}

/**
 * 在可选房间里点选一间。再次点另一间会改选。
 */
function selectCheckInRoom(roomRow: RoomRow): void {
  if (isEmpty(roomRow) || roomRow.roomStatus !== HotelRoomStatus.IDLE) {
    return;
  }
  selectedCheckInRoomId.value = roomRow.id;
}

/**
 * 打开入住确认。页面上已经选好订单或散客晚数，以及房间。
 */
function openCheckInConfirm(roomRow: RoomRow | null): void {
  if (checkInSearched.value !== true) {
    ElMessage.warning('请先按联系方式查询今天的预定');
    return;
  }
  if (todayBookingList.value.length > 0 && isEmpty(selectedTodayOrder.value)) {
    ElMessage.warning('请选择今天的预定');
    return;
  }
  if (todayBookingList.value.length === 0 && resolveWalkInNightCount() === null) {
    ElMessage.warning('请填写入住晚数');
    return;
  }
  const targetRoom = isEmpty(roomRow) ? roomList.value.find((item) => item.id === selectedCheckInRoomId.value) : roomRow;
  if (isEmpty(targetRoom)) {
    ElMessage.warning('请选择空闲房间');
    return;
  }
  if (targetRoom.roomStatus !== HotelRoomStatus.IDLE) {
    ElMessage.warning('房间不是空闲状态');
    return;
  }
  if (isEmpty(selectedTodayOrder.value) !== true && targetRoom.roomTypeId !== selectedTodayOrder.value.roomTypeId) {
    ElMessage.warning('房间与预订房型不一致');
    return;
  }
  selectedCheckInRoomId.value = targetRoom.id;
  openingRoom.value = targetRoom;
  checkInVisible.value = true;
}

/**
 * 入住成功后清掉查询态并刷新页面。
 */
async function onCheckInSaved(): Promise<void> {
  checkInContact.value = '';
  searchedContact.value = '';
  checkInSearched.value = false;
  selectedOrderId.value = '';
  selectedCheckInRoomId.value = '';
  await loadPage();
}

/**
 * 续住成功后刷新页面。
 */
async function onExtendSaved(): Promise<void> {
  await loadPage();
}

/**
 * 换一单预定时清掉已经选过的房间。
 */
watch(selectedOrderId, () => {
  selectedCheckInRoomId.value = '';
});

/**
 * 打扫完成，房间改回空闲。
 */
async function finishCleaning(roomRow: RoomRow): Promise<void> {
  await ElMessageBox.confirm(`确认将 ${roomRow.roomNo} 改为空闲？`, '打扫完成');
  await http.post(HotelApi.roomFinishCleaning(roomRow.id));
  await loadPage();
}

/**
 * 打开在住房的续住日期，并默认选中当前离店日。
 */
function showExtend(roomRow: RoomRow): void {
  extendingRoom.value = roomRow;
  const stayOrder = occupiedOrder(roomRow);
  if (isEmpty(stayOrder) || isEmpty(stayOrder.checkOutDate)) {
    extendDate.value = '';
  } else {
    extendDate.value = stayOrder.checkOutDate.slice(0, 10);
  }
  extendVisible.value = true;
}

/**
 * 退房。不扣房费，房间改为打扫中。
 */
async function checkOut(roomRow: RoomRow): Promise<void> {
  const stayOrder = occupiedOrder(roomRow);
  if (isEmpty(stayOrder)) {
    ElMessage.warning('没有找到在住订单');
    return;
  }
  await ElMessageBox.confirm(`确认将 ${roomRow.roomNo} 退房？`, '退房');
  await http.post(HotelApi.bookingOrderCheckOut(stayOrder.bookingOrderId));
  ElMessage.success('已退房');
  await loadPage();
}

/**
 * 把空闲或维修改成另一种。在住不能走这里。
 */
async function changeRoomStatus(roomRow: RoomRow, roomStatus: string): Promise<void> {
  if (roomStatus === roomRow.roomStatus || roomRow.roomStatus === HotelRoomStatus.OCCUPIED) {
    return;
  }
  await ElMessageBox.confirm(`确认将 ${roomRow.roomNo} 改为${statusLabel(roomStatus)}？`, '切换状态');
  await http.post(HotelApi.roomStatus(roomRow.id), { roomStatus });
  await loadPage();
}

/**
 * 刷新整个页面。
 */
function reloadPage(): void {
  window.location.reload();
}

/**
 * 刷新后核对正在办理的预定。订单已不在已预订里就退出这次查询；房间不再可选就取消选中。
 */
function syncCheckInSelection(): void {
  if (checkInSearched.value !== true) {
    return;
  }
  if (isEmpty(selectedOrderId.value) !== true) {
    const stillBooked = bookedOrderList.value.some((orderRow) => orderRow.bookingOrderId === selectedOrderId.value);
    if (stillBooked !== true) {
      clearCheckInSearch();
      return;
    }
  }
  if (isEmpty(selectedCheckInRoomId.value)) {
    return;
  }
  const stillSelectable = checkInRoomList.value.some((roomRow) => roomRow.id === selectedCheckInRoomId.value);
  if (stillSelectable !== true) {
    selectedCheckInRoomId.value = '';
  }
}

/**
 * 轮询一轮：房间、订单、收款，并同步入住选中态。
 */
async function refreshRoomStatusPage(): Promise<void> {
  await loadRooms();
  await loadOrders();
  await loadPaymentNotices();
  syncCheckInSelection();
}

const { startRoomStatusRefresh, stopRoomStatusRefresh } = useHotelRoomStatusRefresh({
  refreshPage: refreshRoomStatusPage,
});

/**
 * 付款弹窗打开后，把焦点放进金额输入框。
 */
function focusDeductAmount(): void {
  deductView.value?.focusAmount();
}

/**
 * 窄屏时付款弹窗跟页面差不多宽，宽屏固定 460。
 */
function syncDeductDialogWidth(): void {
  deductDialogWidth.value = narrowScreenQuery.matches ? '92%' : '460px';
}

onMounted(() => {
  syncDeductDialogWidth();
  narrowScreenQuery.addEventListener('change', syncDeductDialogWidth);
  void loadPage();
  void loadPaymentNotices();
  startRoomStatusRefresh();
});

onBeforeUnmount(() => {
  narrowScreenQuery.removeEventListener('change', syncDeductDialogWidth);
  stopRoomStatusRefresh();
  stopPaymentAudio();
});
</script>

<style scoped>
.room-status-page {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: calc(100vh - 56px - 24px);
}

.room-status-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.room-status-main :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.room-status-body {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 0;
}

.room-status-rooms {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.room-status-empty {
  color: #909399;
}

.room-status-group + .room-status-group {
  margin-top: 20px;
}

.room-status-group-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
}

.room-status-pick-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
}

.room-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

@media (max-width: 768px) {
  .room-status-main,
  .room-status-main :deep(.el-card__body) {
    min-height: auto;
  }

  .room-status-body {
    flex: none;
    flex-direction: column;
    min-height: auto;
  }

  .room-status-rooms {
    flex: none;
    width: auto;
    min-height: auto;
    overflow: visible;
  }

  .room-status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
