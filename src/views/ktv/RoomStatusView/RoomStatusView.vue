<template>
  <div class="room-status-page" @pointerdown="preparePaymentAudio">
    <ShopSwitcher />
    <el-card class="room-status-main">
      <RoomStatusSummary :count-list="roomStatusCountList" @deduct="deductVisible = true" @refresh="reloadPage" />
      <div class="room-status-body">
        <div v-loading="pageLoading" class="room-status-rooms">
          <div v-if="pageLoading !== true && isEmpty(roomStatusGroupList)" class="room-status-empty">暂无数据</div>
          <section v-for="roomStatusGroup in roomStatusGroupList" :key="roomStatusGroup.roomTypeId" class="room-status-group">
            <h3 class="room-status-group-title">{{ roomStatusGroup.typeName }}</h3>
            <div v-if="isEmpty(roomTypeWarningText(roomTypeWarningList, roomStatusGroup.roomTypeId)) !== true" class="room-status-warning">
              {{ roomTypeWarningText(roomTypeWarningList, roomStatusGroup.roomTypeId) }}
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
import { ElMessageBox } from 'element-plus';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import DeductView from '../DeductView/DeductView.vue';
import OpenRoomDialog from './OpenRoomDialog.vue';
import ExtendRoomDialog from './ExtendRoomDialog.vue';
import PendingVerifyDialog from './PendingVerifyDialog.vue';
import RoomStatusCard from './RoomStatusCard.vue';
import RoomStatusOrdersAside from './RoomStatusOrdersAside.vue';
import RoomStatusSummary from './RoomStatusSummary.vue';
import { useKtvRoomStatusRefresh } from '../../../hooks/ktv-room-status-refresh';
import { usePaymentNotice } from '../../../hooks/payment-notice';
import { useSaving } from '../../../hooks/saving';
import {
  KtvOccupyRemind,
  KtvOrderStatus,
  KtvPendingVerifyWindow,
  KtvRoomStatus,
  PageSetting,
  PermissionCode,
  RecordStatus,
} from '../../../utils/constants';
import { occupyEndMs, occupyRemindText, roomExtendHourText, roomOccupyEndText, roomOccupyRemindText } from '../../../utils/ktv-occupy';
import {
  buildPendingTypeCountList,
  buildRoomTypeWarningList,
  roomTypeWarningText,
} from '../../../utils/ktv-room-type-warning';
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

interface RoomStatusOption {
  value: string;
  label: string;
}

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.KTV_ROOM_SAVE);
const canVerify = sessionStore.hasPermission(PermissionCode.KTV_ORDER_VERIFY);
const { saving, runSaving } = useSaving();
const { preparePaymentAudio, loadPaymentNotices, stopPaymentAudio } = usePaymentNotice(KtvApi.PAYMENT_NOTICES);
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
const pendingTypeCountList = computed(() => buildPendingTypeCountList(pendingBookingList.value));

/**
 * 同一时段待核销单快占满或已经占满空闲包厢时给出提示。
 */
const roomTypeWarningList = computed(() => {
  return buildRoomTypeWarningList(pendingBookingList.value, roomList.value, pendingTypeCountList.value);
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

const { startRoomStatusRefresh, stopRoomStatusRefresh } = useKtvRoomStatusRefresh({
  loadRooms,
  loadPaymentNotices,
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
