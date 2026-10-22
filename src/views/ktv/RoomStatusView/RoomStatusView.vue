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
        <div class="room-status-rooms">
          <div v-if="isEmpty(roomStatusGroupList)" class="room-status-empty">暂无数据</div>
          <section v-for="roomStatusGroup in roomStatusGroupList" :key="roomStatusGroup.roomTypeId" class="room-status-group">
            <h3 class="room-status-group-title">{{ roomStatusGroup.typeName }}</h3>
            <div v-if="isEmpty(roomTypeWarningText(roomStatusGroup.roomTypeId)) !== true" class="room-status-warning">
              {{ roomTypeWarningText(roomStatusGroup.roomTypeId) }}
            </div>
            <div class="room-status-grid">
        <article v-for="roomRow in roomStatusGroup.roomList" :key="roomRow.id" class="room-status-card" :class="roomStatusCardClass(roomRow.roomStatus)">
          <div class="room-status-actions">
            <button
              v-if="roomRow.roomStatus === KtvRoomStatus.IDLE && (canVerify || canSave)"
              type="button"
              class="room-status-flow"
              title="开包厢"
              @click="showOpenRoom(roomRow)"
            >
              <AppIcon class="room-status-flow-icon" :icon-name="MenuIconName.KTV_ROOM_OPEN" />
            </button>
            <button
              v-else-if="roomRow.roomStatus === KtvRoomStatus.IN_USE && canSave"
              type="button"
              class="room-status-flow"
              title="打扫中"
              @click="changeRoomStatus(roomRow, KtvRoomStatus.CLEANING)"
            >
              <AppIcon class="room-status-flow-icon" :icon-name="MenuIconName.KTV_ROOM_CLEAN" />
            </button>
            <button
              v-else-if="roomRow.roomStatus === KtvRoomStatus.CLEANING && canSave"
              type="button"
              class="room-status-flow"
              title="空闲"
              @click="changeRoomStatus(roomRow, KtvRoomStatus.IDLE)"
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
                  @click="onMoreStatus(roomRow, roomStatusOption.value)"
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
            {{ roomRow.roomName }}
            <template v-if="isEmpty(roomHourlyPrice(roomRow.roomTypeId)) !== true"> {{ roomHourlyPrice(roomRow.roomTypeId) }}/小时</template>
          </div>
          <div class="room-status-text">{{ roomStatusLabel(roomRow.roomStatus) }}</div>
          <div
            v-if="isEmpty(roomOccupyEndText(roomRow)) !== true || isEmpty(roomExtendHourText(roomRow)) !== true || (roomRow.roomStatus === KtvRoomStatus.IN_USE && canVerify)"
            class="room-status-occupy-line"
          >
            <span v-if="isEmpty(roomOccupyEndText(roomRow)) !== true" class="room-status-occupy">{{ roomOccupyEndText(roomRow) }}</span>
            <span v-if="isEmpty(roomExtendHourText(roomRow)) !== true" class="room-status-occupy">{{ roomExtendHourText(roomRow) }}</span>
            <button
              v-if="roomRow.roomStatus === KtvRoomStatus.IN_USE && canVerify"
              type="button"
              class="room-status-extend"
              @click="showExtendOccupy(roomRow)"
            >
              延长
            </button>
          </div>
          <div v-if="isEmpty(roomOccupyRemindText(roomRow)) !== true" class="room-status-occupy">{{ roomOccupyRemindText(roomRow) }}</div>
        </article>
            </div>
          </section>
        </div>
        <aside class="room-status-orders">
          <div v-if="isEmpty(occupyRemindRoomList) !== true" class="room-status-due">
            <div class="room-status-order-stat">
              <span class="room-status-order-stat-label">即将到点</span>
              <span class="room-status-order-stat-count">{{ occupyRemindRoomList.length }}</span>
            </div>
            <article v-for="occupyRemindRoom in occupyRemindRoomList" :key="occupyRemindRoom.roomId" class="room-status-order">
              <div class="room-status-order-name">{{ occupyRemindRoom.roomNo }} {{ occupyRemindRoom.roomName }}</div>
              <div class="room-status-order-line">{{ occupyRemindRoom.remindText }}</div>
            </article>
          </div>
          <div class="room-status-order-stat">
            <span class="room-status-order-stat-label">待核销</span>
            <span class="room-status-order-stat-count">{{ pendingBookingList.length }}</span>
          </div>
          <div v-if="isEmpty(pendingTypeCountList) !== true" class="room-status-order-types">
            <span v-for="pendingTypeCount in pendingTypeCountList" :key="pendingTypeCount.roomTypeId" class="room-status-order-type">
              {{ pendingTypeCount.typeName }} {{ pendingTypeCount.count }}
            </span>
          </div>
          <div v-for="roomTypeWarning in roomTypeWarningList" :key="roomTypeWarning.roomTypeId" class="room-status-warning">
            {{ roomTypeWarning.warningText }}
          </div>
          <div v-if="isEmpty(pendingBookingList)" class="room-status-empty">暂无待核销订单</div>
          <article v-for="pendingOrder in pendingBookingList" :key="pendingOrder.bookingOrderId" class="room-status-order">
            <div class="room-status-order-name">{{ pendingOrder.username }}</div>
            <div class="room-status-order-line">{{ pendingOrder.roomTypeName }}</div>
            <div class="room-status-order-line">{{ pendingOrder.bookingDate }} {{ formatClock(pendingOrder.startTime) }} - {{ formatBookingEnd(pendingOrder) }}</div>
            <div class="room-status-order-line">核销码 {{ VerifyCodeMask }}</div>
          </article>
        </aside>
      </div>
      <el-dialog v-model="deductVisible" title="付款" :width="deductDialogWidth" :trap-focus="false" destroy-on-close @opened="focusDeductAmount">
        <DeductView ref="deductView" @close="deductVisible = false" />
      </el-dialog>
      <el-dialog v-model="openRoomVisible" :title="openRoomTitle" :width="openRoomDialogWidth" align-center>
        <div v-if="isEmpty(openingRoom) !== true" class="room-status-open-room" :class="roomStatusCardClass(openingRoom.roomStatus)">
          <div class="room-status-open-no">{{ openingRoom.roomNo }}</div>
          <div class="room-status-open-meta">
            {{ openingRoom.roomName }}
            <template v-if="isEmpty(roomHourlyPrice(openingRoom.roomTypeId)) !== true"> · {{ roomHourlyPrice(openingRoom.roomTypeId) }}/小时</template>
            · {{ roomStatusLabel(openingRoom.roomStatus) }}
          </div>
        </div>
        <div class="room-status-verify-label">核销码</div>
        <div class="room-status-verify">
          <el-input v-model="verifyCode" class="room-status-verify-input" size="large" clearable placeholder="扫码或手动输入" />
          <ScanButton type="warning" size="large" class="room-status-verify-scan" aria-label="扫码" @scanned="onVerifyCodeScanned" />
        </div>
        <template v-if="isEmpty(verifyCode.trim())">
          <div class="room-status-verify-label room-status-duration-label">演唱时长</div>
          <el-radio-group v-model="occupyDurationHours" class="room-status-duration">
            <el-radio-button v-for="hourCount in KtvOccupyDuration.HOUR_LIST" :key="hourCount" :value="hourCount">{{ hourCount }} 小时</el-radio-button>
          </el-radio-group>
        </template>
        <p class="room-status-verify-hint">有预约就扫核销码；线下开包厢不填核销码，请选择 {{ KtvOccupyDuration.HOUR_LIST.join('、') }} 小时。</p>
        <template #footer>
          <div class="room-status-open-actions">
            <el-button size="large" @click="openRoomVisible = false">取消</el-button>
            <el-button size="large" type="primary" @click="submitOpenRoom">确认开包厢</el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog v-model="extendRoomVisible" :title="extendRoomTitle" :width="openRoomDialogWidth" align-center>
        <div v-if="isEmpty(extendingRoom) !== true" class="room-status-open-room" :class="roomStatusCardClass(extendingRoom.roomStatus)">
          <div class="room-status-open-no">{{ extendingRoom.roomNo }}</div>
          <div class="room-status-open-meta">
            {{ extendingRoom.roomName }}
            <template v-if="isEmpty(roomOccupyEndText(extendingRoom)) !== true"> · {{ roomOccupyEndText(extendingRoom) }}</template>
            <template v-if="isEmpty(roomExtendHourText(extendingRoom)) !== true"> · {{ roomExtendHourText(extendingRoom) }}</template>
          </div>
        </div>
        <p class="room-status-verify-hint">每次延长 {{ KtvOccupyDuration.EXTEND_HOURS }} 小时，从当前到期时间往后加。多次延长只累计小时数。</p>
        <template #footer>
          <div class="room-status-open-actions">
            <el-button size="large" @click="extendRoomVisible = false">取消</el-button>
            <el-button size="large" type="primary" @click="submitExtendOccupy">确认延长</el-button>
          </div>
        </template>
      </el-dialog>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import DeductView from '../DeductView/DeductView.vue';
import { KtvOccupyDuration, KtvOccupyRemind, KtvOrderStatus, KtvPendingVerifyWindow, KtvRoomStatus, MenuIconName, PageSetting, PermissionCode, RecordStatus, VerifyCodeMask, statusLabel } from '../../../utils/constants';
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

interface PendingOrder {
  bookingOrderId: string;
  verifyCode: string;
  orderStatus: string;
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
const roomList = ref<RoomStatusRow[]>([]);
const roomTypeList = ref<RoomTypeOption[]>([]);
const pendingBookingList = ref<PendingBookingOrder[]>([]);
const verifyCode = ref('');
const occupyDurationHours = ref<number | undefined>(undefined);
const openRoomVisible = ref(false);
const extendRoomVisible = ref(false);
const deductVisible = ref(false);
const deductView = ref<{ focusAmount: () => void } | null>(null);
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');
const deductDialogWidth = ref('460px');
const openRoomDialogWidth = ref('420px');
const openingRoom = ref<RoomStatusRow | null>(null);
const extendingRoom = ref<RoomStatusRow | null>(null);

/**
 * 延长弹窗标题。没有选中包厢时只显示延长。
 */
const extendRoomTitle = computed(() => {
  if (isEmpty(extendingRoom.value)) {
    return '延长';
  }
  return `延长 ${extendingRoom.value.roomNo}`;
});

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
        remindText: occupyRemindText(roomRow.occupyEndAt, nowMs),
      },
    ];
  });
  remindRoomList.sort((leftRoom, rightRoom) => leftRoom.endMs - rightRoom.endMs);
  return remindRoomList;
});

/**
 * 开包厢弹窗标题带上当前包厢编号。还没选中包厢时只显示开包厢。
 */
const openRoomTitle = computed(() => {
  if (isEmpty(openingRoom.value)) {
    return '开包厢';
  }
  return `开包厢 · ${openingRoom.value.roomNo}`;
});
const roomStatusOptionList: RoomStatusOption[] = [
  { value: KtvRoomStatus.IDLE, label: '空闲' },
  { value: KtvRoomStatus.IN_USE, label: '使用中' },
  { value: KtvRoomStatus.CLEANING, label: '打扫中' },
  { value: KtvRoomStatus.MAINTENANCE, label: '维修中' },
  { value: KtvRoomStatus.CLOSED, label: '临时关闭' },
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
        roomList: groupedRoomList,
      },
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
      count,
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
        count: 1,
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
        warningText: roomTypeWarningMessage(typeName, peakCount, idleCount, freeLeft),
      },
    ];
  });
});

/**
 * 查询当前门店启用中的包厢，并带上待核销订单。
 */
async function loadRooms(): Promise<void> {
  const pageResult = (await http.get('/a380/ktv/rooms')) as { list: RoomStatusRow[] };
  const roomTypePage = (await http.get('/a380/ktv/room-types')) as { list: RoomTypeOption[] };
  const pendingOrderList = await loadAllPendingOrders();
  roomList.value = pageResult.list.filter((roomRow) => roomRow.status === RecordStatus.ENABLED);
  roomTypeList.value = roomTypePage.list;
  pendingBookingList.value = pendingOrderList;
}

/**
 * 翻页取开唱时间落在现在前后窗口内的待核销订单。某一页没有数据时停止，避免空页死循环。
 */
async function loadAllPendingOrders(): Promise<PendingBookingOrder[]> {
  const pendingOrderList: PendingBookingOrder[] = [];
  let page = PageSetting.DEFAULT_PAGE;
  let total = 0;
  do {
    const pageResult = (await http.get('/a380/ktv/booking-orders', {
      params: {
        orderStatus: KtvOrderStatus.PENDING_VERIFY,
        recentHours: KtvPendingVerifyWindow.HOURS,
        page,
        pageSize: PageSetting.ROOM_LOOKUP_PAGE_SIZE,
      },
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
 * 线下演唱时长必须是可选小时里的一档。
 */
function isOccupyDurationHours(durationHours: number | undefined): boolean {
  if (isEmpty(durationHours)) {
    return false;
  }
  return KtvOccupyDuration.HOUR_LIST.some((hourCount) => hourCount === durationHours);
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
 * 把钟点收成 HH:mm。
 */
function formatClock(timeText: string): string {
  if (timeText.length >= 5) {
    return timeText.slice(0, 5);
  }
  return timeText;
}

/**
 * 结束钟点不晚于开唱钟点时，表示已经跨到第二天。
 */
function formatBookingEnd(pendingOrder: PendingBookingOrder): string {
  const endClock = formatClock(pendingOrder.endTime);
  if (pendingOrder.endTime <= pendingOrder.startTime) {
    return `次日 ${endClock}`;
  }
  return endClock;
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
 * 更多操作列出除当前状态以外的全部状态。使用中走开包厢，没有保存权限时不出现其余状态。
 */
function moreStatusOptionList(roomStatus: string): RoomStatusOption[] {
  return roomStatusOptionList.filter((roomStatusOption) => {
    if (roomStatusOption.value === roomStatus) {
      return false;
    }
    if (roomStatusOption.value === KtvRoomStatus.IN_USE) {
      return canVerify || canSave;
    }
    return canSave;
  });
}

/**
 * 扫核销码写入输入框。
 */
function onVerifyCodeScanned(scannedVerifyCode: string): void {
  verifyCode.value = scannedVerifyCode;
}

/**
 * 打开核销码输入。空闲按钮和更多里的使用中都走这里。
 */
function showOpenRoom(roomRow: RoomStatusRow): void {
  openingRoom.value = roomRow;
  verifyCode.value = '';
  occupyDurationHours.value = undefined;
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
 * 开包厢。填写核销码就核销对应订单；不填则按线下开包厢，直接改成使用中。
 */
async function submitOpenRoom(): Promise<void> {
  if (isEmpty(openingRoom.value)) {
    return;
  }
  const verifyCodeText = verifyCode.value.trim();
  if (isEmpty(verifyCodeText)) {
    if (canSave !== true) {
      ElMessage.warning('请填写核销码');
      return;
    }
    if (isOccupyDurationHours(occupyDurationHours.value) !== true) {
      ElMessage.warning(`请选择${KtvOccupyDuration.HOUR_LIST.join('、')}小时`);
      return;
    }
    await http.put(`\/a380/ktv/rooms/${openingRoom.value.id}/room-status`, {
      roomStatus: KtvRoomStatus.IN_USE,
      durationHours: occupyDurationHours.value,
    });
    ElMessage.success('开包厢成功');
    openRoomVisible.value = false;
    verifyCode.value = '';
    occupyDurationHours.value = undefined;
    await loadRooms();
    return;
  }
  const pageResult = (await http.get('/a380/ktv/booking-orders', {
    params: {
      verifyCode: verifyCodeText,
      page: PageSetting.DEFAULT_PAGE,
      pageSize: PageSetting.DEFAULT_PAGE_SIZE,
    },
  })) as { list: PendingOrder[] };
  const pendingOrder = pageResult.list.find((bookingOrder) => {
    return bookingOrder.verifyCode === verifyCodeText && bookingOrder.orderStatus === KtvOrderStatus.PENDING_VERIFY;
  });
  if (isEmpty(pendingOrder)) {
    ElMessage.warning('没有找到待核销订单');
    return;
  }
  await http.post(`\/a380/ktv/booking-orders/${pendingOrder.bookingOrderId}/verify`, {
    roomId: openingRoom.value.id,
  });
  ElMessage.success('开包厢成功');
  openRoomVisible.value = false;
  verifyCode.value = '';
  await loadRooms();
}

/**
 * 延长使用中包厢。固定加 1 小时到当前到期时间，并累计延长小时。
 */
async function submitExtendOccupy(): Promise<void> {
  if (isEmpty(extendingRoom.value)) {
    return;
  }
  await http.post(`\/a380/ktv/rooms/${extendingRoom.value.id}/extend-occupy`, {
    durationHours: KtvOccupyDuration.EXTEND_HOURS,
  });
  ElMessage.success('延长成功');
  extendRoomVisible.value = false;
  await loadRooms();
}

/**
 * 手动切换包厢状态。确认后再请求。使用中不能被选成目标状态。
 */
async function changeRoomStatus(roomRow: RoomStatusRow, roomStatus: string): Promise<void> {
  if (roomStatus === roomRow.roomStatus || roomStatus === KtvRoomStatus.IN_USE) {
    return;
  }
  await ElMessageBox.confirm(`确认将 ${roomRow.roomNo} 改为${roomStatusLabel(roomStatus)}？`, '切换状态');
  await http.put(`\/a380/ktv/rooms/${roomRow.id}/room-status`, { roomStatus });
  await loadRooms();
}

/**
 * 刷新整个页面。
 */
function reloadPage(): void {
  window.location.reload();
}

/** 包厢状态、待核销订单和到账提示的轮询间隔，单位毫秒。 */
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
 * 检查新的店内消费和扫码付款。第一次只记住最大账单，之后才响并弹出通知。
 */
async function loadPaymentNotices(): Promise<void> {
  if (paymentNoticeLoading) {
    return;
  }
  paymentNoticeLoading = true;
  const isBaseline = !paymentNoticeBaselineReady;
  try {
    const noticeList = (await http.get('/a380/ktv/payment-notices')) as PaymentNoticeRow[];
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
 */
async function refreshRoomStatusPage(): Promise<void> {
  if (roomStatusRefreshing) {
    return;
  }
  roomStatusRefreshing = true;
  try {
    await loadRooms();
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

/**
 * 窄屏时开包厢弹窗跟页面差不多宽，宽屏固定 420。
 */
function syncOpenRoomDialogWidth(): void {
  openRoomDialogWidth.value = narrowScreenQuery.matches ? '92%' : '420px';
}

onMounted(() => {
  syncDeductDialogWidth();
  syncOpenRoomDialogWidth();
  narrowScreenQuery.addEventListener('change', syncDeductDialogWidth);
  narrowScreenQuery.addEventListener('change', syncOpenRoomDialogWidth);
  void loadRooms();
  void loadPaymentNotices();
  startRoomStatusRefresh();
});

onBeforeUnmount(() => {
  narrowScreenQuery.removeEventListener('change', syncDeductDialogWidth);
  narrowScreenQuery.removeEventListener('change', syncOpenRoomDialogWidth);
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

.room-status-verify {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-status-verify-input {
  flex: 1;
}

.room-status-verify-scan {
  height: 40px;
  margin: 0;
  border-radius: 8px;
  font-weight: 600;
}

.room-status-verify-scan svg {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  vertical-align: -3px;
}

.room-status-duration-label {
  margin-top: 16px;
}

.room-status-duration {
  display: flex;
  width: 100%;
}

.room-status-duration :deep(.el-radio-button) {
  flex: 1;
}

.room-status-duration :deep(.el-radio-button__inner) {
  width: 100%;
  padding-left: 0;
  padding-right: 0;
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

.room-status-due {
  margin-bottom: 16px;
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

.room-status-card.is-in-use,
.room-status-count.is-in-use,
.room-status-more-dot.is-in-use,
.room-status-open-room.is-in-use {
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

.room-status-card.is-closed,
.room-status-count.is-closed,
.room-status-more-dot.is-closed,
.room-status-open-room.is-closed {
  background: #5e6772;
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
