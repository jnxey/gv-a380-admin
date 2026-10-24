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
      <div class="room-status-body">
        <div v-loading="pageLoading" class="room-status-rooms">
          <div v-if="pageLoading !== true && isEmpty(roomStatusGroupList)" class="room-status-empty">暂无数据</div>
          <section v-for="roomStatusGroup in roomStatusGroupList" :key="roomStatusGroup.roomTypeId" class="room-status-group">
            <h3 class="room-status-group-title">{{ roomStatusGroup.typeName }}</h3>
            <div v-if="isEmpty(roomTypeWarningText(roomStatusGroup.roomTypeId)) !== true" class="room-status-warning">
              {{ roomTypeWarningText(roomStatusGroup.roomTypeId) }}
            </div>
            <div class="room-status-grid">
              <RoomStatusCard
                v-for="roomRow in roomStatusGroup.roomList"
                :key="roomRow.id"
                :room="roomRow"
                :hourly-price="roomHourlyPrice(roomRow.roomTypeId)"
                :occupy-end-text="roomOccupyEndText(roomRow)"
                :extend-hour-text="roomExtendHourText(roomRow)"
                :occupy-remind-text="roomOccupyRemindText(roomRow)"
                :can-save="canSave"
                :can-verify="canVerify"
                @open="showOpenRoom(roomRow)"
                @extend="showExtendOccupy(roomRow)"
                @change-status="(roomStatus) => changeRoomStatus(roomRow, roomStatus)"
                @more-status="(roomStatus) => onMoreStatus(roomRow, roomStatus)"
              />
            </div>
          </section>
        </div>
        <RoomStatusOrdersAside
          :occupy-remind-room-list="occupyRemindRoomList"
          :pending-booking-list="pendingBookingList"
          :pending-type-count-list="pendingTypeCountList"
          :room-type-warning-list="roomTypeWarningList"
          :can-verify="canVerify"
          @verify="openPendingVerify"
        />
      </div>
      <el-dialog v-model="deductVisible" title="付款" :width="deductDialogWidth" :trap-focus="false" destroy-on-close @opened="focusDeductAmount">
        <DeductView ref="deductView" @close="deductVisible = false" />
      </el-dialog>
      <OpenRoomDialog
        v-model="openRoomVisible"
        :room="openingRoom"
        :hourly-price="isEmpty(openingRoom) ? '' : roomHourlyPrice(openingRoom.roomTypeId)"
        :can-save="canSave"
        @saved="onOpenRoomSaved"
      />
      <ExtendRoomDialog
        v-model="extendRoomVisible"
        :room="extendingRoom"
        :occupy-end-text="isEmpty(extendingRoom) ? '' : roomOccupyEndText(extendingRoom)"
        :extend-hour-text="isEmpty(extendingRoom) ? '' : roomExtendHourText(extendingRoom)"
        @saved="onExtendRoomSaved"
      />
      <PendingVerifyDialog v-model="pendingVerifyVisible" :order="pendingVerifyOrder" @saved="onPendingVerifySaved" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { KtvApi } from '../../../api/ktv';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessageBox, ElNotification } from 'element-plus';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import DeductView from '../DeductView/DeductView.vue';
import OpenRoomDialog from './OpenRoomDialog.vue';
import ExtendRoomDialog from './ExtendRoomDialog.vue';
import PendingVerifyDialog from './PendingVerifyDialog.vue';
import RoomStatusCard from './RoomStatusCard.vue';
import RoomStatusOrdersAside from './RoomStatusOrdersAside.vue';
import { useSaving } from '../../../hooks/saving';
import {
  KtvOccupyRemind,
  KtvOrderStatus,
  KtvPendingVerifyWindow,
  KtvRoomStatus,
  MenuIconName,
  PageSetting,
  PermissionCode,
  RecordStatus,
  statusLabel
} from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface RoomStatusRow {
  id: string;
  roomNo: string;
  roomName: string;
  roomTypeId: string;
  status: string;
  roomStatus: string;
  occupyEndAt: string | null;
  occupyExtendHours: number;
}

interface OccupyRemindRoom {
  roomId: string;
  roomNo: string;
  roomName: string;
  endMs: number;
  remindText: string;
}

interface RoomTypeOption {
  id: string;
  typeName: string;
  hourlyPrice: string | number;
}

interface RoomStatusGroup {
  roomTypeId: string;
  typeName: string;
  roomList: RoomStatusRow[];
}

interface PendingBookingOrder {
  bookingOrderId: string;
  username: string;
  roomTypeId: string;
  roomTypeName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  verifyCode: string;
  orderStatus: string;
}

interface PendingTypeCount {
  roomTypeId: string;
  typeName: string;
  count: number;
}

interface RoomTypeWarning {
  roomTypeId: string;
  warningText: string;
}

interface BookingRangePoint {
  timeMs: number;
  changeCount: number;
}

interface RoomStatusOption {
  value: string;
  label: string;
}

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.KTV_ROOM_SAVE);
const canVerify = sessionStore.hasPermission(PermissionCode.KTV_ORDER_VERIFY);
const { saving, runSaving } = useSaving();
const roomList = ref<RoomStatusRow[]>([]);
const roomTypeList = ref<RoomTypeOption[]>([]);
const pendingBookingList = ref<PendingBookingOrder[]>([]);
const pageLoading = ref(true);
const openRoomVisible = ref(false);
const extendRoomVisible = ref(false);
const pendingVerifyVisible = ref(false);
const deductVisible = ref(false);
const deductView = ref<{ focusAmount: () => void } | null>(null);
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');
const deductDialogWidth = ref('460px');
const openingRoom = ref<RoomStatusRow | null>(null);
const extendingRoom = ref<RoomStatusRow | null>(null);
const pendingVerifyOrder = ref<PendingBookingOrder | null>(null);

/**
 * 使用中且已到提醒窗口的包厢，按结束时间从早到晚排。
 */
const occupyRemindRoomList = computed<OccupyRemindRoom[]>(() => {
  const nowMs = Date.now();
  const leadMilliseconds = KtvOccupyRemind.LEAD_MINUTES * KtvOccupyRemind.MINUTE_MILLISECONDS;
  const remindRoomList = roomList.value.flatMap((roomRow) => {
    if (roomRow.roomStatus !== KtvRoomStatus.IN_USE || isEmpty(roomRow.occupyEndAt)) {
      return [];
    }
    const endMs = occupyEndMs(roomRow.occupyEndAt);
    if (Number.isNaN(endMs)) {
      return [];
    }
    const remainMilliseconds = endMs - nowMs;
    if (remainMilliseconds > leadMilliseconds) {
      return [];
    }
    return [
      {
        roomId: roomRow.id,
        roomNo: roomRow.roomNo,
        roomName: roomRow.roomName,
        endMs,
        remindText: occupyRemindText(roomRow.occupyEndAt, nowMs)
      }
    ];
  });
  remindRoomList.sort((leftRoom, rightRoom) => leftRoom.endMs - rightRoom.endMs);
  return remindRoomList;
});

const roomStatusOptionList: RoomStatusOption[] = [
  { value: KtvRoomStatus.IDLE, label: '空闲' },
  { value: KtvRoomStatus.IN_USE, label: '使用中' },
  { value: KtvRoomStatus.CLEANING, label: '打扫中' },
  { value: KtvRoomStatus.MAINTENANCE, label: '维修中' },
  { value: KtvRoomStatus.CLOSED, label: '临时关闭' }
];

/**
 * 按包厢类型的现有顺序分块。没有启用包厢的类型不出现。
 */
const roomStatusGroupList = computed<RoomStatusGroup[]>(() => {
  return roomTypeList.value.flatMap((roomType) => {
    const groupedRoomList = roomList.value.filter((roomRow) => roomRow.roomTypeId === roomType.id);
    if (groupedRoomList.length === 0) {
      return [];
    }
    return [
      {
        roomTypeId: roomType.id,
        typeName: roomType.typeName,
        roomList: groupedRoomList
      }
    ];
  });
});

/**
 * 各运营状态的启用包厢数量。没有包厢的状态也显示 0。
 */
const roomStatusCountList = computed(() => {
  return roomStatusOptionList.map((roomStatusOption) => {
    const count = roomList.value.filter((roomRow) => roomRow.roomStatus === roomStatusOption.value).length;
    return {
      value: roomStatusOption.value,
      label: roomStatusOption.label,
      count
    };
  });
});

/**
 * 待核销订单按包厢类型计数。
 */
const pendingTypeCountList = computed<PendingTypeCount[]>(() => {
  const pendingTypeCountMap = new Map<string, PendingTypeCount>();
  pendingBookingList.value.forEach((pendingOrder) => {
    const pendingTypeCount = pendingTypeCountMap.get(pendingOrder.roomTypeId);
    if (pendingTypeCount === undefined) {
      pendingTypeCountMap.set(pendingOrder.roomTypeId, {
        roomTypeId: pendingOrder.roomTypeId,
        typeName: pendingOrder.roomTypeName,
        count: 1
      });
      return;
    }
    pendingTypeCount.count += 1;
  });
  return Array.from(pendingTypeCountMap.values());
});

/**
 * 同一时段待核销单快占满或已经占满空闲包厢时给出提示。
 */
const roomTypeWarningList = computed<RoomTypeWarning[]>(() => {
  const roomTypeIdList = pendingTypeCountList.value.map((pendingTypeCount) => pendingTypeCount.roomTypeId);
  return roomTypeIdList.flatMap((roomTypeId) => {
    const typeOrderList = pendingBookingList.value.filter((pendingOrder) => pendingOrder.roomTypeId === roomTypeId);
    const peakCount = peakPendingCount(typeOrderList);
    if (peakCount === 0) {
      return [];
    }
    const idleCount = roomList.value.filter((roomRow) => {
      return roomRow.roomTypeId === roomTypeId && roomRow.roomStatus === KtvRoomStatus.IDLE;
    }).length;
    const freeLeft = idleCount - peakCount;
    if (freeLeft > 1) {
      return [];
    }
    const firstPendingOrder = typeOrderList[0];
    if (isEmpty(firstPendingOrder)) {
      return [];
    }
    const typeName = firstPendingOrder.roomTypeName;
    return [
      {
        roomTypeId,
        warningText: roomTypeWarningMessage(typeName, peakCount, idleCount, freeLeft)
      }
    ];
  });
});

/**
 * 查询当前门店启用中的包厢。可按需补拉房型和待核销。
 */
async function loadRooms(options?: { reloadRoomTypes?: boolean; reloadPending?: boolean }): Promise<void> {
  const reloadRoomTypes = options?.reloadRoomTypes === true || isEmpty(roomTypeList.value);
  const reloadPending = options?.reloadPending !== false;
  const pageResult = (await http.get(KtvApi.ROOMS)) as { list: RoomStatusRow[] };
  roomList.value = pageResult.list.filter((roomRow) => roomRow.status === RecordStatus.ENABLED);
  if (reloadRoomTypes) {
    const roomTypePage = (await http.get(KtvApi.ROOM_TYPES)) as { list: RoomTypeOption[] };
    roomTypeList.value = roomTypePage.list;
  }
  if (reloadPending) {
    pendingBookingList.value = await loadAllPendingOrders();
  }
}

/**
 * 首次进入页面：包厢、房型、待核销都拉一遍，并关掉首屏 loading。
 */
async function loadRoomsFirst(): Promise<void> {
  pageLoading.value = true;
  try {
    await loadRooms({ reloadRoomTypes: true, reloadPending: true });
  } finally {
    pageLoading.value = false;
  }
}

/**
 * 翻页取开唱时间落在现在前后窗口内的待核销订单。某一页没有数据时停止，避免空页死循环。
 */
async function loadAllPendingOrders(): Promise<PendingBookingOrder[]> {
  const pendingOrderList: PendingBookingOrder[] = [];
  let page = PageSetting.DEFAULT_PAGE;
  let total = 0;
  do {
    const pageResult = (await http.get(KtvApi.BOOKING_ORDERS, {
      params: {
        orderStatus: KtvOrderStatus.PENDING_VERIFY,
        recentHours: KtvPendingVerifyWindow.HOURS,
        page,
        pageSize: PageSetting.ROOM_LOOKUP_PAGE_SIZE
      }
    })) as { list: PendingBookingOrder[]; total: number };
    if (isEmpty(pageResult.list)) {
      break;
    }
    pendingOrderList.push(...pageResult.list);
    total = pageResult.total;
    page += 1;
  } while (pendingOrderList.length < total);
  return pendingOrderList;
}

/**
 * 把包厢结束时间解析成本地毫秒。接口里的时间带时区，按原样解析；无法解析时返回 NaN。
 */
function occupyEndMs(occupyEndAt: string): number {
  const dateTimeText = occupyEndAt.trim();
  // 1. 带 T 或 Z 的是接口序列化后的时间，不能把秒后面的时区当成数字
  if (dateTimeText.includes('T') || dateTimeText.endsWith('Z')) {
    const parsedMs = Date.parse(dateTimeText);
    if (Number.isNaN(parsedMs)) {
      return Number.NaN;
    }
    return parsedMs;
  }
  // 2. 纯日期时间按本地钟面拆开
  const datePartList = dateTimeText.slice(0, 10).split('-');
  const timePartList = dateTimeText.slice(11).split(':');
  const year = Number(datePartList[0]);
  const month = Number(datePartList[1]);
  const day = Number(datePartList[2]);
  const hour = Number(timePartList[0]);
  const minute = Number(timePartList[1]);
  const secondText = isEmpty(timePartList[2]) ? '0' : timePartList[2].split('.')[0];
  const second = Number(secondText);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(hour) || Number.isNaN(minute) || Number.isNaN(second)) {
    return Number.NaN;
  }
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

/**
 * 结束钟点。不是今天就写成次日。
 */
function occupyEndClockText(occupyEndAt: string, nowMs: number): string {
  const endAt = new Date(occupyEndMs(occupyEndAt));
  const now = new Date(nowMs);
  const hourText = String(endAt.getHours()).padStart(2, '0');
  const minuteText = String(endAt.getMinutes()).padStart(2, '0');
  const endClock = `${hourText}:${minuteText}`;
  const sameDay = endAt.getFullYear() === now.getFullYear() && endAt.getMonth() === now.getMonth() && endAt.getDate() === now.getDate();
  if (sameDay) {
    return `${endClock} 结束`;
  }
  return `次日 ${endClock} 结束`;
}

/**
 * 临近或超时的提醒句。还早于提醒窗口时为空。
 */
function occupyRemindText(occupyEndAt: string, nowMs: number): string {
  const endMs = occupyEndMs(occupyEndAt);
  if (Number.isNaN(endMs)) {
    return '';
  }
  const remainMilliseconds = endMs - nowMs;
  const leadMilliseconds = KtvOccupyRemind.LEAD_MINUTES * KtvOccupyRemind.MINUTE_MILLISECONDS;
  if (remainMilliseconds > leadMilliseconds) {
    return '';
  }
  if (remainMilliseconds > 0) {
    const remainMinutes = Math.ceil(remainMilliseconds / KtvOccupyRemind.MINUTE_MILLISECONDS);
    return `还剩 ${remainMinutes} 分钟`;
  }
  if (-remainMilliseconds < KtvOccupyRemind.MINUTE_MILLISECONDS) {
    return '已到点';
  }
  const overtimeMinutes = Math.floor(-remainMilliseconds / KtvOccupyRemind.MINUTE_MILLISECONDS);
  return `已超时 ${overtimeMinutes} 分钟`;
}

/**
 * 卡片上的到点钟点。不是使用中或没有结束时间时为空。
 */
function roomOccupyEndText(roomRow: RoomStatusRow): string {
  if (roomRow.roomStatus !== KtvRoomStatus.IN_USE || isEmpty(roomRow.occupyEndAt)) {
    return '';
  }
  const endMs = occupyEndMs(roomRow.occupyEndAt);
  if (Number.isNaN(endMs)) {
    return '';
  }
  return occupyEndClockText(roomRow.occupyEndAt, Date.now());
}

/**
 * 卡片上的临近或超时提醒。不是使用中或没有结束时间时为空。
 */
function roomOccupyRemindText(roomRow: RoomStatusRow): string {
  if (roomRow.roomStatus !== KtvRoomStatus.IN_USE || isEmpty(roomRow.occupyEndAt)) {
    return '';
  }
  return occupyRemindText(roomRow.occupyEndAt, Date.now());
}

/**
 * 使用中包厢累计延长的小时。没有延长或不是使用中时为空。
 */
function roomExtendHourText(roomRow: RoomStatusRow): string {
  if (roomRow.roomStatus !== KtvRoomStatus.IN_USE) {
    return '';
  }
  const extendHours = Number(roomRow.occupyExtendHours);
  if (Number.isInteger(extendHours) !== true || extendHours <= 0) {
    return '';
  }
  return `已延长 ${extendHours} 小时`;
}

/**
 * 开唱时刻的本地毫秒。用年月日分开构造，避免把日期串当成 UTC。
 */
function bookingStartMs(pendingOrder: PendingBookingOrder): number {
  const datePartList = pendingOrder.bookingDate.slice(0, 10).split('-');
  const timePartList = pendingOrder.startTime.split(':');
  const year = Number(datePartList[0]);
  const month = Number(datePartList[1]);
  const day = Number(datePartList[2]);
  const hour = Number(timePartList[0]);
  const minute = Number(timePartList[1]);
  const second = Number(timePartList[2] || '0');
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

/**
 * 计算同一包厢类型里，待核销订单在同一时刻最多叠几单。相邻小时不算重叠。
 */
function peakPendingCount(bookingOrderList: PendingBookingOrder[]): number {
  if (isEmpty(bookingOrderList)) {
    return 0;
  }
  // 1. 每张订单拆成开唱加一、结束减一
  const pointList: BookingRangePoint[] = [];
  bookingOrderList.forEach((pendingOrder) => {
    const startMs = bookingStartMs(pendingOrder);
    const endMs = startMs + pendingOrder.durationHours * 60 * 60 * 1000;
    pointList.push({ timeMs: startMs, changeCount: 1 });
    pointList.push({ timeMs: endMs, changeCount: -1 });
  });
  // 2. 同一时刻先结束再开唱，相邻小时不叠在一起
  pointList.sort((leftPoint, rightPoint) => {
    if (leftPoint.timeMs !== rightPoint.timeMs) {
      return leftPoint.timeMs - rightPoint.timeMs;
    }
    return leftPoint.changeCount - rightPoint.changeCount;
  });
  // 3. 扫一遍，留下同时在场的最大单数
  let currentCount = 0;
  let peakCount = 0;
  pointList.forEach((point) => {
    currentCount += point.changeCount;
    if (currentCount > peakCount) {
      peakCount = currentCount;
    }
  });
  return peakCount;
}

/**
 * 按剩余空闲间数生成提示。还剩 1 间、刚好达到、已经超过各一句。
 */
function roomTypeWarningMessage(typeName: string, peakCount: number, idleCount: number, freeLeft: number): string {
  if (freeLeft === 1) {
    return `${typeName}同一时段待核销 ${peakCount} 单，空闲 ${idleCount} 间，还剩 1 间`;
  }
  if (peakCount === idleCount) {
    return `${typeName}同一时段待核销 ${peakCount} 单，已达到空闲包厢 ${idleCount} 间`;
  }
  return `${typeName}同一时段待核销 ${peakCount} 单，已超过空闲包厢 ${idleCount} 间`;
}

/**
 * 取出某个包厢类型的订满提示。没有提示时返回空字符串。
 */
function roomTypeWarningText(roomTypeId: string): string {
  const roomTypeWarning = roomTypeWarningList.value.find((item) => item.roomTypeId === roomTypeId);
  if (isEmpty(roomTypeWarning)) {
    return '';
  }
  return roomTypeWarning.warningText;
}

/**
 * 取出包厢类型的每小时价格。没有类型时返回空字符串。
 */
function roomHourlyPrice(roomTypeId: string): string {
  const roomType = roomTypeList.value.find((item) => item.id === roomTypeId);
  if (isEmpty(roomType) || isEmpty(roomType.hourlyPrice)) {
    return '';
  }
  return String(roomType.hourlyPrice);
}

/**
 * 包厢运营状态的中文。维修中和酒店房态的「维修」不是同一句文案。
 */
function roomStatusLabel(roomStatus: string): string {
  const roomStatusOption = roomStatusOptionList.find((item) => item.value === roomStatus);
  if (isEmpty(roomStatusOption)) {
    return roomStatus;
  }
  return roomStatusOption.label;
}

/**
 * 包厢运营状态对应的卡片底色。
 */
function roomStatusCardClass(roomStatus: string): string {
  if (roomStatus === KtvRoomStatus.IDLE) {
    return 'is-idle';
  }
  if (roomStatus === KtvRoomStatus.IN_USE) {
    return 'is-in-use';
  }
  if (roomStatus === KtvRoomStatus.CLEANING) {
    return 'is-cleaning';
  }
  if (roomStatus === KtvRoomStatus.MAINTENANCE) {
    return 'is-maintenance';
  }
  if (roomStatus === KtvRoomStatus.CLOSED) {
    return 'is-closed';
  }
  return '';
}

/**
 * 打开核销码输入。空闲按钮和更多里的使用中都走这里。
 */
function showOpenRoom(roomRow: RoomStatusRow): void {
  openingRoom.value = roomRow;
  openRoomVisible.value = true;
}

/**
 * 打开使用中包厢的延长确认。每次固定延长 1 小时。
 */
function showExtendOccupy(roomRow: RoomStatusRow): void {
  extendingRoom.value = roomRow;
  extendRoomVisible.value = true;
}

/**
 * 更多操作。使用中不直接改状态，其余状态调用改状态接口。
 */
function onMoreStatus(roomRow: RoomStatusRow, roomStatus: string): void {
  if (roomStatus === KtvRoomStatus.IN_USE) {
    showOpenRoom(roomRow);
    return;
  }
  void changeRoomStatus(roomRow, roomStatus);
}

/**
 * 开包厢成功后按是否核销决定要不要重拉待核销列表。
 */
function onOpenRoomSaved(reloadPending: boolean): void {
  void loadRooms({ reloadPending });
}

/**
 * 延长成功后只刷新包厢状态。
 */
function onExtendRoomSaved(): void {
  void loadRooms({ reloadPending: false });
}

/**
 * 打开待核销办理弹窗。空闲包厢由弹窗内拉取。
 */
function openPendingVerify(pendingOrder: PendingBookingOrder): void {
  pendingVerifyOrder.value = pendingOrder;
  pendingVerifyVisible.value = true;
}

/**
 * 侧栏核销成功后刷新包厢与待核销。
 */
function onPendingVerifySaved(): void {
  void loadRooms({ reloadPending: true });
}

/**
 * 手动切换包厢状态。确认后再请求。使用中不能被选成目标状态。
 */
async function changeRoomStatus(roomRow: RoomStatusRow, roomStatus: string): Promise<void> {
  if (roomStatus === roomRow.roomStatus || roomStatus === KtvRoomStatus.IN_USE) {
    return;
  }
  await ElMessageBox.confirm(`确认将 ${roomRow.roomNo} 改为${roomStatusLabel(roomStatus)}？`, '切换状态');
  await runSaving(async () => {
    await http.put(KtvApi.roomStatus(roomRow.id), { roomStatus });
    await loadRooms({ reloadPending: false });
  });
}

/**
 * 刷新整个页面。
 */
function reloadPage(): void {
  window.location.reload();
}

/** 包厢状态、待核销订单和到账提示的轮询间隔，单位毫秒。 */
const roomStatusRefreshInterval = 3000;
/** 待核销每隔多少次房态轮询再拉一次，减轻分页压力。 */
const pendingReloadEveryPollCount = 5;
/** 收款播报语言。 */
const paymentNoticeSpeechLanguage = 'zh-CN';
/** 收款播报开头。 */
const paymentNoticeSpeechPrefix = '收款';
/** 收款播报结尾。 */
const paymentNoticeSpeechSuffix = '元';
let roomStatusTimer = 0;
let roomStatusRefreshing = false;
let roomStatusPollCount = 0;
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
 * 检查新的店内消费和扫码付款。第一次只记住最大账单，之后才响并弹出通知。
 */
async function loadPaymentNotices(): Promise<void> {
  if (paymentNoticeLoading) {
    return;
  }
  paymentNoticeLoading = true;
  const isBaseline = !paymentNoticeBaselineReady;
  try {
    const noticeList = (await http.get(KtvApi.PAYMENT_NOTICES)) as PaymentNoticeRow[];
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
 * 同时刷新包厢状态，并检查新的店内消费和扫码付款。上一轮还没回来时跳过，避免请求叠在一起。
 * 房型不随轮询重拉；待核销按次数节流。
 */
async function refreshRoomStatusPage(): Promise<void> {
  if (roomStatusRefreshing) {
    return;
  }
  roomStatusRefreshing = true;
  try {
    roomStatusPollCount += 1;
    const reloadPending = roomStatusPollCount % pendingReloadEveryPollCount === 0;
    await loadRooms({ reloadPending });
    await loadPaymentNotices();
  } finally {
    roomStatusRefreshing = false;
  }
}

/**
 * 进入页面后按固定间隔刷新包厢状态和待核销订单。
 */
function startRoomStatusRefresh(): void {
  roomStatusTimer = window.setInterval(() => {
    void refreshRoomStatusPage();
  }, roomStatusRefreshInterval);
}

/**
 * 离开页面后停止包厢状态刷新。
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
  void loadRoomsFirst();
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

.room-status-count.is-idle {
  background: #248a4a;
}

.room-status-count.is-in-use {
  background: #b56a08;
}

.room-status-count.is-cleaning {
  background: #217eae;
}

.room-status-count.is-maintenance {
  background: #b84545;
}

.room-status-count.is-closed {
  background: #5e6772;
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
