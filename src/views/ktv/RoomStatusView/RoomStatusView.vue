<template>
  <div class="room-status-page">
    <ShopSwitcher />
    <el-card class="room-status-main">
    <div v-if="isEmpty(roomStatusGroupList)" class="room-status-empty">暂无数据</div>
    <section v-for="roomStatusGroup in roomStatusGroupList" :key="roomStatusGroup.roomTypeId" class="room-status-group">
      <h3 class="room-status-group-title">{{ roomStatusGroup.typeName }}</h3>
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
                  {{ roomStatusOption.label }}
                </button>
              </div>
              <template #reference>
                <button type="button" class="room-status-more" title="更多状态">···</button>
              </template>
            </el-popover>
          </div>
          <div class="room-status-name">{{ roomRow.roomName }}</div>
          <div class="room-status-no">{{ roomRow.roomNo }}</div>
          <div class="room-status-text">{{ roomStatusLabel(roomRow.roomStatus) }}</div>
        </article>
    </div>
    </section>
    <el-dialog v-model="openRoomVisible" title="开包厢" width="360px">
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
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { KtvOrderStatus, KtvRoomStatus, MenuIconName, PageSetting, PermissionCode, RecordStatus } from '../../../utils/constants';
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

interface RoomStatusOption {
  value: string;
  label: string;
}

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.KTV_ROOM_SAVE);
const canVerify = sessionStore.hasPermission(PermissionCode.KTV_ORDER_VERIFY);
const roomList = ref<RoomStatusRow[]>([]);
const roomTypeList = ref<RoomTypeOption[]>([]);
const verifyCode = ref('');
const openRoomVisible = ref(false);
const openingRoom = ref<RoomStatusRow | null>(null);
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
 * 查询当前门店启用中的包厢，并带上类型名称。
 */
async function loadRooms(): Promise<void> {
  const pageResult = (await http.get('/admin/ktv/rooms')) as { list: RoomStatusRow[] };
  const roomTypePage = (await http.get('/admin/ktv/room-types')) as { list: RoomTypeOption[] };
  roomList.value = pageResult.list.filter((roomRow) => roomRow.status === RecordStatus.ENABLED);
  roomTypeList.value = roomTypePage.list;
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
 * 手动切换包厢状态。使用中不能被选成目标状态。
 */
async function changeRoomStatus(roomRow: RoomStatusRow, roomStatus: string): Promise<void> {
  if (roomStatus === roomRow.roomStatus || roomStatus === KtvRoomStatus.IN_USE) {
    return;
  }
  await http.put(`/admin/ktv/rooms/${roomRow.id}/room-status`, { roomStatus });
  await loadRooms();
}

onMounted(() => {
  void loadRooms();
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
}

.room-status-empty {
  color: #909399;
}

.room-status-group + .room-status-group {
  margin-top: 20px;
}

.room-status-group-title {
  margin: 0 0 12px;
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

.room-status-card.is-idle {
  background: #b7ebc6;
}

.room-status-card.is-in-use {
  background: #f5c16c;
}

.room-status-card.is-cleaning {
  background: #9fd4f5;
}

.room-status-card.is-maintenance {
  background: #f0a3a3;
}

.room-status-card.is-closed {
  background: #d0d5dd;
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
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
}

.room-status-no {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: #344054;
}

.room-status-text {
  margin-top: 12px;
  font-size: 13px;
  line-height: 20px;
  color: #1c2434;
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
  padding: 6px 0;
  font-size: 13px;
  line-height: 20px;
  color: #1c2434;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.room-status-more-item:hover {
  color: #2563eb;
}
</style>
