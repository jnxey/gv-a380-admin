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
        <button type="button" class="room-status-deduct" @click="deductVisible = true">扣款</button>
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
        </article>
            </div>
          </section>
        </div>
        <aside class="room-status-orders">
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
      <el-dialog v-model="deductVisible" title="扣款" :width="deductDialogWidth" destroy-on-close>
        <DeductView />
      </el-dialog>
      <el-dialog v-model="openRoomVisible" :title="openRoomTitle" width="360px">
      <el-input v-model="verifyCode" placeholder="核销码，线下开包厢可不填" />
      <template #footer>
        <el-button size="large" @click="openRoomVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="submitOpenRoom">确认开包厢</el-button>
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
import { KtvOrderStatus, KtvRoomStatus, MenuIconName, PageSetting, PermissionCode, RecordStatus, VerifyCodeMask } from '../../../utils/constants';
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
const openRoomVisible = ref(false);
const deductVisible = ref(false);
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');
const deductDialogWidth = ref('460px');
const openingRoom = ref<RoomStatusRow | null>(null);

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
  const pageResult = (await http.get('/admin/ktv/rooms')) as { list: RoomStatusRow[] };
  const roomTypePage = (await http.get('/admin/ktv/room-types')) as { list: RoomTypeOption[] };
  const pendingOrderList = await loadAllPendingOrders();
  roomList.value = pageResult.list.filter((roomRow) => roomRow.status === RecordStatus.ENABLED);
  roomTypeList.value = roomTypePage.list;
  pendingBookingList.value = pendingOrderList;
}

/**
 * 翻页取完全部待核销订单。某一页没有数据时停止，避免空页死循环。
 */
async function loadAllPendingOrders(): Promise<PendingBookingOrder[]> {
  const pendingOrderList: PendingBookingOrder[] = [];
  let page = PageSetting.DEFAULT_PAGE;
  let total = 0;
  do {
    const pageResult = (await http.get('/admin/ktv/booking-orders', {
      params: {
        orderStatus: KtvOrderStatus.PENDING_VERIFY,
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
 * 打开核销码输入。空闲按钮和更多里的使用中都走这里。
 */
function showOpenRoom(roomRow: RoomStatusRow): void {
  openingRoom.value = roomRow;
  verifyCode.value = '';
  openRoomVisible.value = true;
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
    await http.put(`/admin/ktv/rooms/${openingRoom.value.id}/room-status`, { roomStatus: KtvRoomStatus.IN_USE });
    ElMessage.success('开包厢成功');
    openRoomVisible.value = false;
    verifyCode.value = '';
    await loadRooms();
    return;
  }
  const pageResult = (await http.get('/admin/ktv/booking-orders', {
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
  await http.post(`/admin/ktv/booking-orders/${pendingOrder.bookingOrderId}/verify`, {
    roomId: openingRoom.value.id,
  });
  ElMessage.success('开包厢成功');
  openRoomVisible.value = false;
  verifyCode.value = '';
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
  await http.put(`/admin/ktv/rooms/${roomRow.id}/room-status`, { roomStatus });
  await loadRooms();
}

/**
 * 刷新整个页面。
 */
function reloadPage(): void {
  window.location.reload();
}

/** 包厢状态和待核销订单的轮询间隔，单位毫秒。 */
const roomStatusRefreshInterval = 3000;
let roomStatusTimer = 0;
let roomStatusRefreshing = false;

/**
 * 同时刷新包厢状态和待核销订单。上一轮还没回来时跳过，避免请求叠在一起。
 */
async function refreshRoomStatusPage(): Promise<void> {
  if (roomStatusRefreshing) {
    return;
  }
  roomStatusRefreshing = true;
  try {
    await loadRooms();
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
 * 窄屏时扣款弹窗跟页面差不多宽，宽屏固定 460。
 */
function syncDeductDialogWidth(): void {
  deductDialogWidth.value = narrowScreenQuery.matches ? '92%' : '460px';
}

onMounted(() => {
  syncDeductDialogWidth();
  narrowScreenQuery.addEventListener('change', syncDeductDialogWidth);
  void loadRooms();
  startRoomStatusRefresh();
});

onBeforeUnmount(() => {
  narrowScreenQuery.removeEventListener('change', syncDeductDialogWidth);
  stopRoomStatusRefresh();
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
  color: #1c2434;
  cursor: pointer;
  background: #e4e7ec;
  border: 0;
  border-radius: 8px;
}

.room-status-deduct {
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
}

.room-status-deduct:hover,
.room-status-refresh:hover {
  background: #d5d9e0;
}

.room-status-refresh-icon {
  width: 18px;
  height: 18px;
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
.room-status-more-dot.is-idle {
  background: #248a4a;
}

.room-status-card.is-in-use,
.room-status-count.is-in-use,
.room-status-more-dot.is-in-use {
  background: #b56a08;
}

.room-status-card.is-cleaning,
.room-status-count.is-cleaning,
.room-status-more-dot.is-cleaning {
  background: #217eae;
}

.room-status-card.is-maintenance,
.room-status-count.is-maintenance,
.room-status-more-dot.is-maintenance {
  background: #b84545;
}

.room-status-card.is-closed,
.room-status-count.is-closed,
.room-status-more-dot.is-closed {
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
