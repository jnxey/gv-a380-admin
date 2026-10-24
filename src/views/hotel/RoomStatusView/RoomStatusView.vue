<template>
  <div class="room-status-page" @pointerdown="preparePaymentAudio">
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
      <div v-if="canCheckIn" class="room-status-check-in-bar">
        <div class="room-status-check-in-search-row">
          <el-input v-model="checkInContact" placeholder="联系方式" clearable />
          <el-button type="primary" @click="searchTodayBooking">查询</el-button>
          <el-button v-if="checkInSearched" @click="clearCheckInSearch">返回房态</el-button>
        </div>
        <div v-if="checkInSearched" class="room-status-check-in-detail">
          <template v-if="todayBookingList.length > 0">
            <el-select v-if="todayBookingList.length > 1" v-model="selectedOrderId" class="room-status-check-in-order" placeholder="选择今天的预定">
              <el-option
                v-for="orderRow in todayBookingList"
                :key="orderRow.bookingOrderId"
                :label="bookedOrderLabel(orderRow)"
                :value="orderRow.bookingOrderId"
              />
            </el-select>
            <div v-if="isEmpty(selectedTodayOrder) !== true" class="room-status-check-in-result">
              <span>预定人 <strong>{{ selectedTodayOrder.guestName }}</strong></span>
              <span>联系方式 <strong>{{ selectedTodayOrder.contact }}</strong></span>
              <span>
                入住
                <strong>{{ formatLocalDateTime(selectedTodayOrder.checkInDate) }} 至 {{ formatLocalDateTime(selectedTodayOrder.checkOutDate) }}</strong>
              </span>
              <span>房型 <strong>{{ selectedTodayOrder.typeName }}</strong></span>
              <el-button class="room-status-check-in-action" type="primary" :disabled="isEmpty(selectedCheckInRoomId)" @click="openCheckInConfirm(null)">
                办理入住
              </el-button>
            </div>
          </template>
          <div v-else class="room-status-check-in-result">
            <span>没有今天的预定</span>
            <span>入住时间 <strong>{{ walkInCheckInDateText }}</strong></span>
            <span class="room-status-check-in-hint">早上 {{ HotelBusinessDay.START_HOUR }} 点前仍算前一天</span>
            <el-radio-group v-model="walkInNightChoice" class="room-status-night-choice">
              <el-radio-button v-for="nightCount in HotelWalkInNight.PRESET_COUNT_LIST" :key="nightCount" :value="nightCount">{{ nightCount }} 晚</el-radio-button>
              <el-radio-button :value="HotelWalkInNight.CUSTOM">自定义</el-radio-button>
            </el-radio-group>
            <el-input
              v-if="walkInNightChoice === HotelWalkInNight.CUSTOM"
              v-model="walkInCustomNightCount"
              class="room-status-walk-in-nights"
              placeholder="入住晚数"
              clearable
            />
            <el-button class="room-status-check-in-action" type="primary" :disabled="isEmpty(selectedCheckInRoomId)" @click="openCheckInConfirm(null)">
              办理入住
            </el-button>
          </div>
        </div>
      </div>
      <div class="room-status-body">
        <div class="room-status-rooms">
          <template v-if="canCheckIn && checkInSearched">
            <h3 class="room-status-pick-title">{{ checkInPickTitle }}</h3>
            <div v-if="todayBookingList.length > 0 && isEmpty(selectedTodayOrder)" class="room-status-empty">请先选择今天的预定</div>
            <div v-else-if="checkInRoomList.length === 0" class="room-status-empty">没有可入住房间</div>
            <div v-else class="room-status-grid">
              <article
                v-for="roomRow in checkInRoomList"
                :key="roomRow.id"
                class="room-status-card room-status-pick-card"
                :class="{ 'is-selected': roomRow.id === selectedCheckInRoomId }"
                @click="selectCheckInRoom(roomRow)"
              >
                <div class="room-status-no">{{ roomRow.roomNo }}</div>
                <div class="room-status-name">
                  {{ roomTypeName(roomRow.roomTypeId) }}
                  <template v-if="isEmpty(roomNightPrice(roomRow.roomTypeId)) !== true"> · {{ roomNightPrice(roomRow.roomTypeId) }}/晚</template>
                </div>
                <div class="room-status-text">{{ roomRow.id === selectedCheckInRoomId ? '已选' : roomStatusLabel(roomRow.roomStatus) }}</div>
              </article>
            </div>
          </template>
          <template v-else>
          <div v-if="roomFloorGroupList.length === 0" class="room-status-empty">暂无数据</div>
          <section v-for="roomFloorGroup in roomFloorGroupList" :key="roomFloorGroup.floorNo" class="room-status-group">
            <h3 class="room-status-group-title">{{ roomFloorGroup.floorNo }}层</h3>
            <div class="room-status-grid">
              <article v-for="roomRow in roomFloorGroup.roomList" :key="roomRow.id" class="room-status-card" :class="roomStatusCardClass(roomRow.roomStatus)">
                <div class="room-status-actions">
                  <button
                    v-if="roomRow.roomStatus === HotelRoomStatus.CLEANING && canCheckOut"
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
                      <button type="button" class="room-status-more" title="更多状态">
                        <AppIcon class="room-status-more-icon" :icon-name="MenuIconName.MORE" />
                      </button>
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
          </template>
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
            <div class="room-status-order-head">
              <div class="room-status-order-name">{{ bookedOrderGuestText(bookedOrder) }}</div>
              <button v-if="canCheckIn" type="button" class="room-status-order-handle" @click="startCheckInFromOrder(bookedOrder)">办理</button>
            </div>
            <div v-if="isEmpty(bookedOrder.contact) !== true" class="room-status-order-line">{{ bookedOrder.contact }}</div>
            <div class="room-status-order-line">{{ bookedOrder.typeName }}</div>
            <div class="room-status-order-line">{{ formatLocalDateTime(bookedOrder.checkInDate) }} 至 {{ formatLocalDateTime(bookedOrder.checkOutDate) }}</div>
          </article>
        </aside>
      </div>
      <el-dialog v-model="deductVisible" title="付款" :width="deductDialogWidth" :trap-focus="false" destroy-on-close @opened="focusDeductAmount">
        <DeductView ref="deductView" @close="deductVisible = false" />
      </el-dialog>
      <el-dialog v-model="checkInVisible" title="办理入住" width="420px" align-center>
        <div v-if="isEmpty(openingRoom) !== true" class="room-status-open-room" :class="roomStatusCardClass(openingRoom.roomStatus)">
          <div class="room-status-open-no">{{ openingRoom.roomNo }}</div>
          <div class="room-status-open-meta">
            {{ openingRoom.floorNo }}层
            <template v-if="isEmpty(roomTypeName(openingRoom.roomTypeId)) !== true"> · {{ roomTypeName(openingRoom.roomTypeId) }}</template>
            <template v-if="isEmpty(roomNightPrice(openingRoom.roomTypeId)) !== true"> · {{ roomNightPrice(openingRoom.roomTypeId) }}/晚</template>
          </div>
        </div>
        <template v-if="isEmpty(selectedTodayOrder) !== true">
          <div class="room-status-check-in-line">预定人 {{ selectedTodayOrder.guestName }}</div>
          <div class="room-status-check-in-line">联系方式 {{ selectedTodayOrder.contact }}</div>
          <div class="room-status-check-in-line">
            {{ formatLocalDateTime(selectedTodayOrder.checkInDate) }} 至 {{ formatLocalDateTime(selectedTodayOrder.checkOutDate) }}
          </div>
        </template>
        <template v-else>
          <div class="room-status-check-in-line">联系方式 {{ searchedContact }}</div>
          <div class="room-status-check-in-line">入住时间 {{ walkInCheckInDateText }}</div>
          <div class="room-status-check-in-line">{{ walkInNightCountText }} 晚</div>
        </template>
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
import { HotelApi } from '../../../api/hotel';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
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
  guestName: string;
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
 * 今天的预定在下拉里的文字。
 */
function bookedOrderLabel(orderRow: OrderRow): string {
  return `${bookedOrderGuestText(orderRow)} ${formatLocalDateTime(orderRow.checkInDate)} 至 ${formatLocalDateTime(orderRow.checkOutDate)}`;
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
  // 1. 先确认已经按联系方式查过，多单时要先选定一单
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
  // 2. 房间必须是空闲的。对上预定时还要和房型一致
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
 * 确认入住。对上今天的预定就办理该订单；没有订单时按今天为这位客人入住。
 */
async function submitCheckIn(): Promise<void> {
  if (isEmpty(openingRoom.value)) {
    return;
  }
  if (isEmpty(selectedTodayOrder.value) !== true) {
    await http.post(HotelApi.bookingOrderCheckIn(selectedTodayOrder.value.bookingOrderId), { roomId: openingRoom.value.id });
  } else {
    const nightCount = resolveWalkInNightCount();
    if (isEmpty(searchedContact.value) || nightCount === null) {
      ElMessage.warning('请填写联系方式和入住晚数');
      return;
    }
    await http.post(HotelApi.roomWalkIn(openingRoom.value.id), {
      contact: searchedContact.value,
      nightCount,
    });
  }
  ElMessage.success('已入住');
  checkInVisible.value = false;
  checkInContact.value = '';
  searchedContact.value = '';
  checkInSearched.value = false;
  selectedOrderId.value = '';
  selectedCheckInRoomId.value = '';
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
  await http.post(HotelApi.bookingOrderExtend(stayOrder.bookingOrderId), { checkOutDate: extendDate.value });
  ElMessage.success('已续住');
  extendVisible.value = false;
  await loadPage();
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
  await ElMessageBox.confirm(`确认将 ${roomRow.roomNo} 改为${roomStatusLabel(roomStatus)}？`, '切换状态');
  await http.post(HotelApi.roomStatus(roomRow.id), { roomStatus });
  await loadPage();
}

/**
 * 刷新整个页面。
 */
function reloadPage(): void {
  window.location.reload();
}

/** 房间状态和到账提示的轮询间隔，单位毫秒。 */
const roomStatusRefreshInterval = 3000;
/** 收款播报语言。 */
const paymentNoticeSpeechLanguage = 'zh-CN';
/** 收款播报开头。 */
const paymentNoticeSpeechPrefix = '收款';
/** 收款播报结尾。 */
const paymentNoticeSpeechSuffix = '元';
let roomStatusTimer = 0;
let roomStatusRefreshing = false;
let paymentNoticeBaselineReady = false;
let paymentNoticeLoading = false;
let latestPaymentNoticeId = 0n;
let paymentSpeechUnlocked = false;

interface PaymentNoticeRow {
  id: string;
  bizType: string;
  amount: string;
  remark: string;
}

/**
 * 把账单主键收成整数，用来判断哪条更新。
 */
function billIdValue(billIdText: string): bigint {
  if (isEmpty(billIdText)) {
    return 0n;
  }
  if (!/^\d+$/.test(billIdText)) {
    return 0n;
  }
  return BigInt(billIdText);
}

/**
 * 选出中文语音。还没有中文语音时返回空，交给浏览器默认语音。
 */
function findChineseVoice(): SpeechSynthesisVoice | null {
  const voiceList = window.speechSynthesis.getVoices();
  for (const voice of voiceList) {
    if (voice.lang === paymentNoticeSpeechLanguage || voice.lang.startsWith('zh')) {
      return voice;
    }
  }
  return null;
}

/**
 * 第一次点击页面时解锁语音。浏览器要有过操作才允许出声。
 */
function preparePaymentAudio(): void {
  if (paymentSpeechUnlocked) {
    return;
  }
  paymentSpeechUnlocked = true;
  window.speechSynthesis.getVoices();
  const unlockUtterance = new SpeechSynthesisUtterance('');
  unlockUtterance.volume = 0;
  window.speechSynthesis.speak(unlockUtterance);
}

/**
 * 用中文播报收款金额。多笔会按调用顺序排成队列。
 */
function playPaymentNoticeSound(amountText: string): void {
  const spokenAmount = isEmpty(amountText) ? '' : amountText.trim();
  if (isEmpty(spokenAmount)) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(`${paymentNoticeSpeechPrefix}${spokenAmount}${paymentNoticeSpeechSuffix}`);
  utterance.lang = paymentNoticeSpeechLanguage;
  const chineseVoice = findChineseVoice();
  if (chineseVoice !== null) {
    utterance.voice = chineseVoice;
  }
  window.speechSynthesis.speak(utterance);
}

/**
 * 停掉还没播完的收款播报。离开页面时调用。
 */
function stopPaymentAudio(): void {
  window.speechSynthesis.cancel();
}

/**
 * 检查新的酒店店内消费和扫码付款。第一次只记住最大账单，之后才响并弹出通知。
 */
async function loadPaymentNotices(): Promise<void> {
  if (paymentNoticeLoading) {
    return;
  }
  paymentNoticeLoading = true;
  const isBaseline = !paymentNoticeBaselineReady;
  try {
    const noticeList = (await http.get(HotelApi.PAYMENT_NOTICES)) as PaymentNoticeRow[];
    if (Array.isArray(noticeList) !== true) {
      return;
    }
    // 1. 记下这一批里最大的账单主键
    let maxBillId = latestPaymentNoticeId;
    for (const noticeRow of noticeList) {
      const billId = billIdValue(noticeRow.id);
      if (billId > maxBillId) {
        maxBillId = billId;
      }
    }
    // 2. 第一次进入只建立基线，不把历史账报出来
    if (isBaseline) {
      paymentNoticeBaselineReady = true;
      latestPaymentNoticeId = maxBillId;
      return;
    }
    const freshNoticeList = noticeList.filter((noticeRow) => billIdValue(noticeRow.id) > latestPaymentNoticeId);
    latestPaymentNoticeId = maxBillId;
    if (freshNoticeList.length === 0) {
      return;
    }
    // 3. 按账单先后各播一句，每条新账各弹一次
    freshNoticeList.sort((leftNotice, rightNotice) => {
      const leftBillId = billIdValue(leftNotice.id);
      const rightBillId = billIdValue(rightNotice.id);
      if (leftBillId < rightBillId) {
        return -1;
      }
      if (leftBillId > rightBillId) {
        return 1;
      }
      return 0;
    });
    for (const noticeRow of freshNoticeList) {
      playPaymentNoticeSound(noticeRow.amount);
      const remarkText = isEmpty(noticeRow.remark) ? '' : noticeRow.remark.trim();
      const noticeMessage = isEmpty(remarkText) ? noticeRow.amount : `${noticeRow.amount} ${remarkText}`;
      ElNotification({ title: statusLabel(noticeRow.bizType), message: noticeMessage, type: 'success' });
    }
  } finally {
    paymentNoticeLoading = false;
  }
}

/**
 * 同时刷新房间和订单，并检查新的店内消费和扫码付款。上一轮还没回来时跳过，避免请求叠在一起。
 */
async function refreshRoomStatusPage(): Promise<void> {
  if (roomStatusRefreshing) {
    return;
  }
  roomStatusRefreshing = true;
  try {
    await loadRooms();
    await loadOrders();
    await loadPaymentNotices();
    syncCheckInSelection();
  } finally {
    roomStatusRefreshing = false;
  }
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
 * 进入页面后按固定间隔刷新房间、订单和到账提示。
 */
function startRoomStatusRefresh(): void {
  roomStatusTimer = window.setInterval(() => {
    void refreshRoomStatusPage();
  }, roomStatusRefreshInterval);
}

/**
 * 离开页面后停止房间状态刷新。
 */
function stopRoomStatusRefresh(): void {
  window.clearInterval(roomStatusTimer);
  roomStatusTimer = 0;
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

.room-status-check-in-bar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid #e6e8ec;
  border-radius: 12px;
  background: #fff;
}

.room-status-check-in-detail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.room-status-check-in-search-row {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.room-status-check-in-search-row :deep(.el-input) {
  width: 220px;
}

.room-status-check-in-order {
  width: 280px;
}

.room-status-check-in-result {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  min-width: 0;
  color: #667085;
  font-size: 13px;
  line-height: 20px;
}

.room-status-check-in-result strong {
  color: #1c2434;
  font-weight: 600;
}

.room-status-check-in-hint {
  color: #98a2b3;
}

.room-status-check-in-action {
  margin-left: 0;
  flex: 0 0 auto;
}

.room-status-check-in-line {
  margin-top: 8px;
  font-size: 13px;
  line-height: 20px;
  color: #1c2434;
}

.room-status-pick-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
}

.room-status-pick-card {
  padding-right: 12px;
  cursor: pointer;
  background: #d8f3e3;
  color: #145c32;
}

.room-status-pick-card .room-status-no,
.room-status-pick-card .room-status-name,
.room-status-pick-card .room-status-text {
  color: #145c32;
}

.room-status-pick-card.is-selected {
  background: #145c32;
  color: #fff;
}

.room-status-pick-card.is-selected .room-status-no,
.room-status-pick-card.is-selected .room-status-name,
.room-status-pick-card.is-selected .room-status-text {
  color: #fff;
}

.room-status-night-choice {
  display: flex;
  flex-wrap: wrap;
  width: auto;
  margin-top: 0;
}

.room-status-night-choice :deep(.el-radio-button__inner) {
  padding-left: 10px;
  padding-right: 10px;
}

.room-status-walk-in-nights {
  width: 120px;
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

.room-status-order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.room-status-order-handle {
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #2563eb;
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
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

.room-status-more-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
  stroke: none;
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
