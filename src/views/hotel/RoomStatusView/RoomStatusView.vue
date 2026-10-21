<template>
  <div class="room-status-page">
    <ShopSwitcher />
    <el-card class="room-status-main">
      <div class="room-status-summary">
        <span
          v-for="roomStatusCount in roomStatusCountList"
          :key="roomStatusCount.value"
          class="room-status-count"
          :class="roomStatusCardClass(roomStatusCount.value)"
        >
          <span class="room-status-count-label">{{ roomStatusCount.label }}</span>
          <span class="room-status-count-value">{{ roomStatusCount.count }}</span>
        </span>
        <button type="button" class="room-status-deduct" @click="deductVisible = true">
          <AppIcon class="room-status-deduct-icon" :icon-name="MenuIconName.FINANCE_BILL" />
          付款
        </button>
        <button type="button" class="room-status-refresh" title="刷新" @click="reloadPage">
          <AppIcon class="room-status-refresh-icon" :icon-name="MenuIconName.REFRESH" />
        </button>
      </div>
      <div class="room-status-body">
        <div class="room-status-rooms">
          <div v-if="roomFloorGroupList.length === 0" class="room-status-empty">暂无数据</div>
          <section v-for="roomFloorGroup in roomFloorGroupList" :key="roomFloorGroup.floorNo" class="room-status-group">
            <h3 class="room-status-group-title">{{ roomFloorGroup.floorNo }}层</h3>
            <div class="room-status-grid">
              <article v-for="roomRow in roomFloorGroup.roomList" :key="roomRow.id" class="room-status-card" :class="roomStatusCardClass(roomRow.roomStatus)">
                <div class="room-status-actions">
                  <button
                    v-if="roomRow.roomStatus === HotelRoomStatus.IDLE && canCheckIn"
                    type="button"
                    class="room-status-flow"
                    title="办理入住"
                    @click="showCheckIn(roomRow)"
                  >
                    <AppIcon class="room-status-flow-icon" :icon-name="MenuIconName.KTV_ROOM_OPEN" />
                  </button>
                  <button
                    v-else-if="roomRow.roomStatus === HotelRoomStatus.CLEANING && canCheckOut"
                    type="button"
                    class="room-status-flow"
                    title="空闲"
                    @click="finishCleaning(roomRow)"
                  >
                    <AppIcon class="room-status-flow-icon" :icon-name="MenuIconName.KTV_ROOM_IDLE" />
                  </button>
                  <el-popover v-if="moreStatusOptionList(roomRow.roomStatus).length > 0" trigger="click" placement="bottom-end" :width="120">
                    <div class="room-status-more-list">
                      <button
                        v-for="roomStatusOption in moreStatusOptionList(roomRow.roomStatus)"
                        :key="roomStatusOption.value"
                        type="button"
                        class="room-status-more-item"
                        @click="changeRoomStatus(roomRow, roomStatusOption.value)"
                      >
                        <span class="room-status-more-dot" :class="roomStatusCardClass(roomStatusOption.value)" />
                        {{ roomStatusOption.label }}
                      </button>
                    </div>
                    <template #reference>
                      <button type="button" class="room-status-more" title="更多状态">···</button>
                    </template>
                  </el-popover>
                </div>
                <div class="room-status-no">{{ roomRow.roomNo }}</div>
                <div class="room-status-name">
                  {{ roomTypeName(roomRow.roomTypeId) }}
                  <template v-if="isEmpty(roomNightPrice(roomRow.roomTypeId)) !== true"> · {{ roomNightPrice(roomRow.roomTypeId) }}/晚</template>
                </div>
                <div class="room-status-text">{{ roomStatusLabel(roomRow.roomStatus) }}</div>
                <div v-if="isEmpty(roomGuestName(roomRow)) !== true" class="room-status-name">{{ roomGuestName(roomRow) }}</div>
                <div
                  v-if="isEmpty(roomCheckOutText(roomRow)) !== true || (roomRow.roomStatus === HotelRoomStatus.OCCUPIED && (canExtend || canCheckOut))"
                  class="room-status-occupy-line"
                >
                  <span v-if="isEmpty(roomCheckOutText(roomRow)) !== true" class="room-status-occupy">{{ roomCheckOutText(roomRow) }}</span>
                  <button
                    v-if="roomRow.roomStatus === HotelRoomStatus.OCCUPIED && canExtend"
                    type="button"
                    class="room-status-extend"
                    @click="showExtend(roomRow)"
                  >
                    续住
                  </button>
                  <button
                    v-if="roomRow.roomStatus === HotelRoomStatus.OCCUPIED && canCheckOut"
                    type="button"
                    class="room-status-extend"
                    @click="checkOut(roomRow)"
                  >
                    退房
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>
        <aside class="room-status-orders">
          <div class="room-status-order-stat">
            <span class="room-status-order-stat-label">已预订</span>
            <span class="room-status-order-stat-count">{{ bookedOrderList.length }}</span>
          </div>
          <div v-if="bookedTypeCountList.length > 0" class="room-status-order-types">
            <span v-for="bookedTypeCount in bookedTypeCountList" :key="bookedTypeCount.roomTypeId" class="room-status-order-type">
              {{ bookedTypeCount.typeName }} {{ bookedTypeCount.count }}
            </span>
          </div>
          <div v-for="roomTypeWarning in roomTypeWarningList" :key="roomTypeWarning.roomTypeId" class="room-status-warning">
            {{ roomTypeWarning.warningText }}
          </div>
          <div v-if="bookedOrderList.length === 0" class="room-status-empty">暂无已预订订单</div>
          <article v-for="bookedOrder in bookedOrderList" :key="bookedOrder.bookingOrderId" class="room-status-order">
            <div class="room-status-order-name">{{ bookedOrder.username }}</div>
            <div class="room-status-order-line">{{ bookedOrder.typeName }}</div>
            <div class="room-status-order-line">{{ formatLocalDateTime(bookedOrder.checkInDate) }} 至 {{ formatLocalDateTime(bookedOrder.checkOutDate) }}</div>
          </article>
        </aside>
      </div>
      <el-dialog v-model="deductVisible" title="付款" :width="deductDialogWidth" :trap-focus="false" destroy-on-close @opened="focusDeductAmount">
        <DeductView ref="deductView" @close="deductVisible = false" />
      </el-dialog>
      <el-dialog v-model="checkInVisible" :title="checkInTitle" width="420px" align-center>
        <div v-if="isEmpty(openingRoom) !== true" class="room-status-open-room" :class="roomStatusCardClass(openingRoom.roomStatus)">
          <div class="room-status-open-no">{{ openingRoom.roomNo }}</div>
          <div class="room-status-open-meta">
            {{ openingRoom.floorNo }}层
            <template v-if="isEmpty(roomNightPrice(openingRoom.roomTypeId)) !== true"> · {{ roomNightPrice(openingRoom.roomTypeId) }}/晚</template>
            · {{ roomStatusLabel(openingRoom.roomStatus) }}
          </div>
        </div>
        <div class="room-status-verify-label">已预订订单</div>
        <div v-if="checkInOrderList.length === 0" class="room-status-empty">该房型没有已预订订单</div>
        <el-select v-else v-model="selectedOrderId" placeholder="选择已预订订单" style="width: 100%">
          <el-option v-for="orderRow in checkInOrderList" :key="orderRow.bookingOrderId" :label="bookedOrderLabel(orderRow)" :value="orderRow.bookingOrderId" />
        </el-select>
        <div class="room-status-verify-label room-status-walk-in-label">没有预订</div>
        <el-input v-model="walkInContact" placeholder="联系方式" clearable />
        <div class="room-status-check-in-date">入住时间 {{ walkInCheckInDateText }}</div>
        <el-radio-group v-model="walkInNightChoice" class="room-status-night-choice">
          <el-radio-button v-for="nightCount in HotelWalkInNight.PRESET_COUNT_LIST" :key="nightCount" :value="nightCount">{{ nightCount }} 晚</el-radio-button>
          <el-radio-button :value="HotelWalkInNight.CUSTOM">自定义</el-radio-button>
        </el-radio-group>
        <el-input
          v-if="walkInNightChoice === HotelWalkInNight.CUSTOM"
          v-model="walkInCustomNightCount"
          class="room-status-walk-in-date"
          placeholder="入住晚数"
          clearable
        />
        <p class="room-status-verify-hint">早上 {{ HotelBusinessDay.START_HOUR }} 点前仍算前一天。离店日为入住日加上所选晚数。</p>
        <template #footer>
          <div class="room-status-open-actions">
            <el-button size="large" @click="checkInVisible = false">取消</el-button>
            <el-button size="large" type="primary" @click="submitCheckIn">确认入住</el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog v-model="extendVisible" :title="extendTitle" width="420px" align-center>
        <div v-if="isEmpty(extendingRoom) !== true" class="room-status-open-room" :class="roomStatusCardClass(extendingRoom.roomStatus)">
          <div class="room-status-open-no">{{ extendingRoom.roomNo }}</div>
          <div class="room-status-open-meta">{{ extendRoomMeta(extendingRoom) }}</div>
        </div>
        <el-date-picker v-model="extendDate" type="date" value-format="YYYY-MM-DD" placeholder="新的离店日期" />
        <p class="room-status-verify-hint">新的离店日期必须晚于当前离店日期。续住和退房都不扣款。</p>
        <template #footer>
          <div class="room-status-open-actions">
            <el-button size="large" @click="extendVisible = false">取消</el-button>
            <el-button size="large" type="primary" @click="submitExtend">确认续住</el-button>
          </div>
        </template>
      </el-dialog>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import DeductView from '../DeductView/DeductView.vue';
import { HotelBusinessDay, HotelOrderStatus, HotelRoomStatus, HotelWalkInNight, MenuIconName, PageSetting, PermissionCode, statusLabel } from '../../../utils/constants';
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
  roomTypeId: string;
  typeName: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  orderStatus: string;
}

interface RoomStatusOption {
  value: string;
  label: string;
}

interface RoomFloorGroup {
  floorNo: string;
  roomList: RoomRow[];
}

interface RoomTypeCount {
  roomTypeId: string;
  typeName: string;
  count: number;
}

interface RoomTypeWarning {
  roomTypeId: string;
  warningText: string;
}

const sessionStore = useSessionStore();
const canCheckIn = sessionStore.hasPermission(PermissionCode.HOTEL_STAY_CHECK_IN);
const canExtend = sessionStore.hasPermission(PermissionCode.HOTEL_STAY_EXTEND);
const canCheckOut = sessionStore.hasPermission(PermissionCode.HOTEL_STAY_CHECK_OUT);
const canSave = sessionStore.hasPermission(PermissionCode.HOTEL_ROOM_SAVE);
const roomList = ref<RoomRow[]>([]);
const roomTypeList = ref<RoomTypeRow[]>([]);
const orderList = ref<OrderRow[]>([]);
const checkInVisible = ref(false);
const extendVisible = ref(false);
const openingRoom = ref<RoomRow | null>(null);
const extendingRoom = ref<RoomRow | null>(null);
const selectedOrderId = ref('');
const extendDate = ref('');
const walkInContact = ref('');
const walkInNightChoice = ref<number | string>(HotelWalkInNight.MIN_COUNT);
const walkInCustomNightCount = ref('');
const walkInCheckInDateText = ref('');
const deductVisible = ref(false);
const deductView = ref<{ focusAmount: () => void } | null>(null);
const deductDialogWidth = ref('460px');
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');
const manualStatusOptionList: RoomStatusOption[] = [
  { value: HotelRoomStatus.IDLE, label: statusLabel(HotelRoomStatus.IDLE) },
  { value: HotelRoomStatus.CLEANING, label: statusLabel(HotelRoomStatus.CLEANING) },
  { value: HotelRoomStatus.MAINTENANCE, label: statusLabel(HotelRoomStatus.MAINTENANCE) },
];

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
  floorNoList.sort((leftFloorNo, rightFloorNo) => leftFloorNo.localeCompare(rightFloorNo, undefined, { numeric: true }));
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
const bookedTypeCountList = computed<RoomTypeCount[]>(() => {
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
const roomTypeWarningList = computed<RoomTypeWarning[]>(() => {
  const warningList: RoomTypeWarning[] = [];
  roomTypeList.value.forEach((roomType) => {
    const warningText = roomTypeWarningText(roomType.id);
    if (isEmpty(warningText)) {
      return;
    }
    warningList.push({
      roomTypeId: roomType.id,
      warningText,
    });
  });
  return warningList;
});

/**
 * 当前房间可选的已预订订单。
 */
const checkInOrderList = computed(() => {
  if (isEmpty(openingRoom.value)) {
    return [];
  }
  const roomTypeId = openingRoom.value.roomTypeId;
  return bookedOrderList.value.filter((orderRow) => orderRow.roomTypeId === roomTypeId);
});

/**
 * 入住弹窗标题。
 */
const checkInTitle = computed(() => {
  if (isEmpty(openingRoom.value)) {
    return '办理入住';
  }
  return `${openingRoom.value.roomNo} 办理入住`;
});

/**
 * 续住弹窗标题。
 */
const extendTitle = computed(() => {
  if (isEmpty(extendingRoom.value)) {
    return '续住';
  }
  return `${extendingRoom.value.roomNo} 续住`;
});

/**
 * 房态卡片底色。
 */
function roomStatusCardClass(roomStatus: string): string {
  if (roomStatus === HotelRoomStatus.IDLE) {
    return 'is-idle';
  }
  if (roomStatus === HotelRoomStatus.OCCUPIED) {
    return 'is-occupied';
  }
  if (roomStatus === HotelRoomStatus.CLEANING) {
    return 'is-cleaning';
  }
  if (roomStatus === HotelRoomStatus.MAINTENANCE) {
    return 'is-maintenance';
  }
  return '';
}

/**
 * 房态中文。
 */
function roomStatusLabel(roomStatus: string): string {
  return statusLabel(roomStatus);
}

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
 * 在住客人。有用户名用用户名，现场入住没有会员时用联系方式。
 */
function roomGuestName(roomRow: RoomRow): string {
  const stayOrder = occupiedOrder(roomRow);
  if (isEmpty(stayOrder)) {
    return '';
  }
  if (isEmpty(stayOrder.username) !== true) {
    return stayOrder.username;
  }
  return isEmpty(stayOrder.contact) ? '' : stayOrder.contact;
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
 * 已预订订单在下拉里的文字。
 */
function bookedOrderLabel(orderRow: OrderRow): string {
  return `${orderRow.username} ${formatLocalDateTime(orderRow.checkInDate)} 至 ${formatLocalDateTime(orderRow.checkOutDate)}`;
}

/**
 * 按已预订单数和空闲间数生成提示。还剩 1 间、刚好达到、已经超过各一句。
 */
function roomTypeWarningText(roomTypeId: string): string {
  const roomType = roomTypeList.value.find((item) => item.id === roomTypeId);
  if (isEmpty(roomType)) {
    return '';
  }
  const bookedCount = bookedOrderList.value.filter((orderRow) => orderRow.roomTypeId === roomTypeId).length;
  const idleCount = roomList.value.filter((roomRow) => {
    return roomRow.roomTypeId === roomTypeId && roomRow.roomStatus === HotelRoomStatus.IDLE;
  }).length;
  if (bookedCount === 0) {
    return '';
  }
  const freeLeft = idleCount - bookedCount;
  if (freeLeft === 1) {
    return `${roomType.typeName}已预订 ${bookedCount} 单，空闲 ${idleCount} 间，还剩 1 间`;
  }
  if (bookedCount === idleCount) {
    return `${roomType.typeName}已预订 ${bookedCount} 单，已达到空闲房间 ${idleCount} 间`;
  }
  if (bookedCount > idleCount) {
    return `${roomType.typeName}已预订 ${bookedCount} 单，已超过空闲房间 ${idleCount} 间`;
  }
  return '';
}

/**
 * 更多操作可在空闲、打扫中和维修之间切换。在住必须先退房，没有保存权限时不出现。
 */
function moreStatusOptionList(roomStatus: string): RoomStatusOption[] {
  if (canSave !== true || roomStatus === HotelRoomStatus.OCCUPIED) {
    return [];
  }
  return manualStatusOptionList.filter((roomStatusOption) => roomStatusOption.value !== roomStatus);
}

/**
 * 读取当前门店全部房间。
 */
async function loadRooms(): Promise<void> {
  const pageResult = (await http.get('/admin/hotel/rooms')) as { list: RoomRow[] };
  roomList.value = pageResult.list;
}

/**
 * 读取当前门店全部房型。
 */
async function loadRoomTypes(): Promise<void> {
  const pageResult = (await http.get('/admin/hotel/room-types')) as { list: RoomTypeRow[] };
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
    const pageResult = (await http.get('/admin/hotel/booking-orders', {
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
 * 把门店时区偏移换成分钟。没有偏移或写错时用东八区。
 */
function timeZoneOffsetMinutes(timeZoneOffset: string): number {
  const offsetText = isEmpty(timeZoneOffset) ? HotelBusinessDay.DEFAULT_TIME_ZONE_OFFSET : timeZoneOffset;
  const signText = offsetText.slice(0, 1);
  const hourText = offsetText.slice(1, 3);
  const minuteText = offsetText.slice(4, 6);
  if (isEmpty(hourText) || isEmpty(minuteText)) {
    if (offsetText === HotelBusinessDay.DEFAULT_TIME_ZONE_OFFSET) {
      return HotelBusinessDay.DEFAULT_OFFSET_MINUTES;
    }
    return timeZoneOffsetMinutes(HotelBusinessDay.DEFAULT_TIME_ZONE_OFFSET);
  }
  const hourNumber = Number(hourText);
  const minuteNumber = Number(minuteText);
  if (Number.isFinite(hourNumber) !== true || Number.isFinite(minuteNumber) !== true) {
    if (offsetText === HotelBusinessDay.DEFAULT_TIME_ZONE_OFFSET) {
      return HotelBusinessDay.DEFAULT_OFFSET_MINUTES;
    }
    return timeZoneOffsetMinutes(HotelBusinessDay.DEFAULT_TIME_ZONE_OFFSET);
  }
  const absoluteMinutes = hourNumber * 60 + minuteNumber;
  if (signText === '-') {
    return -absoluteMinutes;
  }
  return absoluteMinutes;
}

/**
 * 把当前时刻平移成门店钟面。日期和钟点读 UTC 字段，避免本机时区。
 */
function toShopWallClock(now: Date, timeZoneOffset: string): Date {
  const offsetMinutes = timeZoneOffsetMinutes(timeZoneOffset);
  const offsetMilliseconds = offsetMinutes * HotelBusinessDay.MILLISECONDS_PER_MINUTE;
  return new Date(now.getTime() + offsetMilliseconds);
}

/**
 * 把 UTC 日期格式化成 YYYY-MM-DD。
 */
function formatUtcDate(date: Date): string {
  const yearText = String(date.getUTCFullYear());
  const monthText = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dayText = String(date.getUTCDate()).padStart(2, '0');
  return `${yearText}-${monthText}-${dayText}`;
}

/**
 * 门店当地的入住日。早上切点前仍算前一天。
 */
function hotelBusinessDateText(now: Date, timeZoneOffset: string): string {
  const shopNow = toShopWallClock(now, timeZoneOffset);
  let businessTime = shopNow.getTime();
  if (shopNow.getUTCHours() < HotelBusinessDay.START_HOUR) {
    businessTime -= HotelBusinessDay.MILLISECONDS_PER_DAY;
  }
  return formatUtcDate(new Date(businessTime));
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
 * 打开这间空闲房的入住选择。
 */
function showCheckIn(roomRow: RoomRow): void {
  openingRoom.value = roomRow;
  selectedOrderId.value = '';
  walkInContact.value = '';
  walkInNightChoice.value = HotelWalkInNight.MIN_COUNT;
  walkInCustomNightCount.value = '';
  walkInCheckInDateText.value = hotelBusinessDateText(new Date(), currentShopTimeZoneOffset());
  checkInVisible.value = true;
}

/**
 * 确认入住。选了已预订订单就办理该订单；没有订单时按今天为这位客人入住。
 */
async function submitCheckIn(): Promise<void> {
  if (isEmpty(openingRoom.value)) {
    return;
  }
  if (isEmpty(selectedOrderId.value) !== true) {
    await http.post(`/admin/hotel/booking-orders/${selectedOrderId.value}/check-in`, { roomId: openingRoom.value.id });
    ElMessage.success('已入住');
    checkInVisible.value = false;
    await loadPage();
    return;
  }
  const contact = walkInContact.value.trim();
  const nightCount = resolveWalkInNightCount();
  if (isEmpty(contact) || nightCount === null) {
    ElMessage.warning('请选择已预订订单，或填写联系方式和入住晚数');
    return;
  }
  await http.post(`/admin/hotel/rooms/${openingRoom.value.id}/walk-in`, {
    contact,
    nightCount,
  });
  ElMessage.success('已入住');
  checkInVisible.value = false;
  await loadPage();
}

/**
 * 打扫完成，房间改回空闲。
 */
async function finishCleaning(roomRow: RoomRow): Promise<void> {
  await ElMessageBox.confirm(`确认将 ${roomRow.roomNo} 改为空闲？`, '打扫完成');
  await http.post(`/admin/hotel/rooms/${roomRow.id}/finish-cleaning`);
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
 * 确认续住。新的离店日必须晚于当前离店日。
 */
async function submitExtend(): Promise<void> {
  if (isEmpty(extendingRoom.value)) {
    return;
  }
  const stayOrder = occupiedOrder(extendingRoom.value);
  if (isEmpty(stayOrder)) {
    ElMessage.warning('没有找到在住订单');
    return;
  }
  if (isEmpty(extendDate.value)) {
    ElMessage.warning('请选择新的离店日期');
    return;
  }
  await http.post(`/admin/hotel/booking-orders/${stayOrder.bookingOrderId}/extend`, { checkOutDate: extendDate.value });
  ElMessage.success('已续住');
  extendVisible.value = false;
  await loadPage();
}

/**
 * 退房并按实际晚数扣房费。
 */
async function checkOut(roomRow: RoomRow): Promise<void> {
  const stayOrder = occupiedOrder(roomRow);
  if (isEmpty(stayOrder)) {
    ElMessage.warning('没有找到在住订单');
    return;
  }
  await ElMessageBox.confirm(`确认将 ${roomRow.roomNo} 退房并扣减房费？`, '退房');
  await http.post(`/admin/hotel/booking-orders/${stayOrder.bookingOrderId}/check-out`);
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
  await ElMessageBox.confirm(`确认将 ${roomRow.roomNo} 改为${roomStatusLabel(roomStatus)}？`, '切换状态');
  await http.post(`/admin/hotel/rooms/${roomRow.id}/room-status`, { roomStatus });
  await loadPage();
}

/**
 * 刷新整个页面。
 */
function reloadPage(): void {
  window.location.reload();
}

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
});

onBeforeUnmount(() => {
  narrowScreenQuery.removeEventListener('change', syncDeductDialogWidth);
});
</script>

<style scoped>
.room-status-open-room {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  color: #fff;
}

.room-status-open-no {
  font-size: 22px;
  font-weight: 600;
  line-height: 28px;
}

.room-status-open-meta {
  margin-top: 2px;
  font-size: 13px;
  line-height: 20px;
}

.room-status-verify-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: #1c2434;
}

.room-status-walk-in-label {
  margin-top: 16px;
}

.room-status-check-in-date {
  margin-top: 8px;
  font-size: 13px;
  line-height: 20px;
  color: #1c2434;
}

.room-status-night-choice {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  margin-top: 8px;
}

.room-status-night-choice :deep(.el-radio-button__inner) {
  padding-left: 10px;
  padding-right: 10px;
}

.room-status-walk-in-date {
  width: 100%;
  margin-top: 8px;
}

.room-status-verify-hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #667085;
}

.room-status-occupy-line {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  margin-top: 4px;
}

.room-status-occupy-line .room-status-occupy,
.room-status-occupy-line .room-status-extend {
  margin-top: 0;
  white-space: nowrap;
}

.room-status-occupy {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: #fff;
}

.room-status-extend {
  margin-top: 0;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  color: #1c2434;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.72);
  border: 0;
  border-radius: 6px;
}

.room-status-extend:hover {
  background: rgba(255, 255, 255, 0.92);
}

.room-status-open-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}

.room-status-open-actions .el-button {
  flex: 1;
  margin: 0;
}

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

.room-status-summary {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.room-status-count {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  color: #fff;
  white-space: nowrap;
}

.room-status-count-value,
.room-status-count-label {
  display: inline-flex;
  align-items: center;
  height: 28px;
  line-height: 1;
}

.room-status-count-value {
  font-size: 22px;
  font-weight: 600;
  transform: translateY(-2px);
}

.room-status-count-label {
  font-size: 12px;
  font-weight: 500;
}

.room-status-deduct,
.room-status-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  height: auto;
  padding: 0 10px;
  cursor: pointer;
  border: 0;
  border-radius: 8px;
}

.room-status-deduct {
  padding: 0 14px;
  color: #ffffff;
  background: #2563eb;
  font-size: 14px;
  font-weight: 600;
}

.room-status-deduct:hover {
  background: #1d4ed8;
}

.room-status-refresh {
  color: #1c2434;
  background: #e4e7ec;
}

.room-status-refresh:hover {
  background: #d5d9e0;
}

.room-status-deduct-icon,
.room-status-refresh-icon {
  width: 18px;
  height: 18px;
}

.room-status-deduct-icon {
  margin-right: 6px;
}

.room-status-body {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 0;
}

.room-status-orders {
  width: 280px;
  flex-shrink: 0;
  overflow: auto;
  padding-left: 12px;
  border-left: 1px solid #e6e8ec;
}

.room-status-order-stat {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.room-status-order-stat-label {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
}

.room-status-order-stat-count {
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
  color: #1c2434;
}

.room-status-order-types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.room-status-order-type {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f4f6f8;
  font-size: 12px;
  line-height: 20px;
  color: #344054;
}

.room-status-warning {
  margin-top: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #fdecea;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: #b42318;
}

.room-status-order {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e6e8ec;
}

.room-status-order-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
}

.room-status-order-line {
  margin-top: 2px;
  font-size: 13px;
  line-height: 20px;
  color: #344054;
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

.room-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.room-status-card {
  position: relative;
  padding: 12px 44px 12px 12px;
  border-radius: 8px;
}

.room-status-card.is-idle,
.room-status-count.is-idle,
.room-status-more-dot.is-idle,
.room-status-open-room.is-idle {
  background: #248a4a;
}

.room-status-card.is-occupied,
.room-status-count.is-occupied,
.room-status-more-dot.is-occupied,
.room-status-open-room.is-occupied {
  background: #b56a08;
}

.room-status-card.is-cleaning,
.room-status-count.is-cleaning,
.room-status-more-dot.is-cleaning,
.room-status-open-room.is-cleaning {
  background: #217eae;
}

.room-status-card.is-maintenance,
.room-status-count.is-maintenance,
.room-status-more-dot.is-maintenance,
.room-status-open-room.is-maintenance {
  background: #b84545;
}

.room-status-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.room-status-flow,
.room-status-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: #1c2434;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.72);
  border: 0;
  border-radius: 6px;
}

.room-status-flow:hover,
.room-status-more:hover {
  color: #1c2434;
  background: rgba(255, 255, 255, 0.92);
}

.room-status-flow-icon {
  width: 18px;
  height: 18px;
}

.room-status-name {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  color: #fff;
}

.room-status-no {
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: #fff;
}

.room-status-text {
  margin-top: 12px;
  font-size: 13px;
  line-height: 20px;
  color: #fff;
}

.room-status-more {
  font-size: 14px;
  line-height: 1;
  letter-spacing: 1px;
}

.room-status-more-list {
  display: flex;
  flex-direction: column;
}

.room-status-more-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  font-size: 13px;
  line-height: 20px;
  color: #1c2434;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.room-status-more-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.room-status-more-item:hover {
  color: #2563eb;
}

@media (max-width: 768px) {
  .room-status-main,
  .room-status-main :deep(.el-card__body) {
    min-height: auto;
  }

  .room-status-summary {
    flex-wrap: wrap;
  }

  .room-status-body {
    flex: none;
    flex-direction: column;
    min-height: auto;
  }

  .room-status-rooms,
  .room-status-orders {
    flex: none;
    width: auto;
    min-height: auto;
    overflow: visible;
  }

  .room-status-orders {
    margin-top: 16px;
    padding-top: 16px;
    padding-left: 0;
    border-top: 1px solid #e6e8ec;
    border-left: 0;
  }

  .room-status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
