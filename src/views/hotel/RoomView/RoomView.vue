<template>
  <ShopSwitcher />
  <el-card>
    <QueryBar @search="searchRooms" @reset="resetRoomFilter">
      <el-form-item>
        <el-select v-model="filterRoomTypeId" clearable placeholder="全部房型" style="width: 160px">
          <el-option v-for="roomType in roomTypeList" :key="roomType.id" :label="roomType.typeName" :value="roomType.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-select v-model="filterRoomStatus" clearable placeholder="全部房态" style="width: 140px">
          <el-option label="空闲" :value="HotelRoomStatus.IDLE" />
          <el-option label="在住" :value="HotelRoomStatus.OCCUPIED" />
          <el-option label="打扫中" :value="HotelRoomStatus.CLEANING" />
          <el-option label="维修" :value="HotelRoomStatus.MAINTENANCE" />
        </el-select>
      </el-form-item>
    </QueryBar>
    <div v-if="canSave" class="room-toolbar">
      <el-button type="primary" @click="openCreate">新建房间</el-button>
    </div>
    <div ref="sortListRef" class="record-list record-list--wide-table">
      <RecordTableHead />
      <div v-if="isEmpty(roomList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="roomRow in roomList" :key="roomRow.id">
        <RecordField label="房号">
          <span class="name-box" :data-key="roomRow.id">
            <button v-if="canDragSort" type="button" class="drag-icon">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  fill="currentColor"
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M5.33333 5.33335C6.06971 5.33335 6.66667 4.7364 6.66667 4.00002C6.66667 3.26364 6.06971 2.66669 5.33333 2.66669C4.59695 2.66669 4 3.26364 4 4.00002C4 4.7364 4.59695 5.33335 5.33333 5.33335ZM10.6667 5.33335C11.403 5.33335 12 4.7364 12 4.00002C12 3.26364 11.403 2.66669 10.6667 2.66669C9.93029 2.66669 9.33333 3.26364 9.33333 4.00002C9.33333 4.7364 9.93029 5.33335 10.6667 5.33335ZM6.66667 8.00002C6.66667 8.7364 6.06971 9.33335 5.33333 9.33335C4.59695 9.33335 4 8.7364 4 8.00002C4 7.26364 4.59695 6.66669 5.33333 6.66669C6.06971 6.66669 6.66667 7.26364 6.66667 8.00002ZM10.6667 9.33335C11.403 9.33335 12 8.7364 12 8.00002C12 7.26364 11.403 6.66669 10.6667 6.66669C9.93029 6.66669 9.33333 7.26364 9.33333 8.00002C9.33333 8.7364 9.93029 9.33335 10.6667 9.33335ZM6.66667 12C6.66667 12.7364 6.06971 13.3334 5.33333 13.3334C4.59695 13.3334 4 12.7364 4 12C4 11.2636 4.59695 10.6667 5.33333 10.6667C6.06971 10.6667 6.66667 11.2636 6.66667 12ZM10.6667 13.3334C11.403 13.3334 12 12.7364 12 12C12 11.2636 11.403 10.6667 10.6667 10.6667C9.93029 10.6667 9.33333 11.2636 9.33333 12C9.33333 12.7364 9.93029 13.3334 10.6667 13.3334Z"
                />
              </svg>
            </button>
            <span>{{ roomRow.roomNo }}</span>
          </span>
        </RecordField>
        <RecordField label="楼层">{{ roomRow.floorNo }}</RecordField>
        <RecordField label="房型">{{ roomTypeName(roomRow.roomTypeId) }}</RecordField>
        <RecordField label="房态">
          <el-tag :type="roomStatusTagType(roomRow.roomStatus)" effect="plain">{{ statusLabel(roomRow.roomStatus) }}</el-tag>
        </RecordField>
        <template v-if="canSave" #actions>
          <el-button link type="primary" @click="openEdit(roomRow)">编辑</el-button>
        </template>
      </RecordCard>
    </div>
    <RoomDialog v-model="dialogVisible" :room="editingRoom" :room-type-list="roomTypeList" @saved="loadRooms" />
  </el-card>
</template>

<script setup lang="ts">
import { HotelApi } from '../../../api/hotel';
import { computed, onMounted, ref } from 'vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordTableHead from '../../../components/RecordTableHead/RecordTableHead.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { HotelRoomStatus, PermissionCode, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import { useDragSort } from '../../../hooks/drag-sort';
import RoomDialog, { type RoomRow, type RoomTypeOption } from './RoomDialog.vue';

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.HOTEL_ROOM_SAVE);
const roomList = ref<RoomRow[]>([]);
const roomTypeList = ref<RoomTypeOption[]>([]);
const filterRoomTypeId = ref('');
const filterRoomStatus = ref('');
const appliedRoomTypeId = ref('');
const appliedRoomStatus = ref('');
const sortListRef = ref<HTMLElement | null>(null);
const dialogVisible = ref(false);
const editingRoom = ref<RoomRow | null>(null);

/**
 * 有筛选时不能拖排序，否则提交的编号列表不完整。
 */
const canDragSort = computed(() => {
  return canSave === true && isEmpty(appliedRoomTypeId.value) && isEmpty(appliedRoomStatus.value);
});

const { initDragSort } = useDragSort(
  () => sortListRef.value,
  () => canDragSort.value === true,
  saveRoomSort,
);

/**
 * 按当前已应用的筛选条件查询房间，并加载房型名称。
 */
async function loadRooms(): Promise<void> {
  const queryParams: { roomTypeId?: string; roomStatus?: string } = {};
  if (isEmpty(appliedRoomTypeId.value) !== true) {
    queryParams.roomTypeId = appliedRoomTypeId.value;
  }
  if (isEmpty(appliedRoomStatus.value) !== true) {
    queryParams.roomStatus = appliedRoomStatus.value;
  }
  const roomPage = (await http.get(HotelApi.ROOMS, {
    params: queryParams,
  })) as { list: RoomRow[] };
  const roomTypePage = (await http.get(HotelApi.ROOM_TYPES)) as { list: RoomTypeOption[] };
  roomList.value = roomPage.list;
  roomTypeList.value = roomTypePage.list;
  await initDragSort();
}

/**
 * 用房型编号换成房型名称。
 */
function roomTypeName(roomTypeId: string): string {
  const roomType = roomTypeList.value.find((item) => item.id === roomTypeId);
  if (isEmpty(roomType)) {
    return '';
  }
  return roomType.typeName;
}

/**
 * 房态对应的标签颜色。
 */
function roomStatusTagType(roomStatus: string): 'success' | 'warning' | 'info' {
  if (roomStatus === HotelRoomStatus.IDLE) {
    return 'success';
  }
  if (roomStatus === HotelRoomStatus.OCCUPIED) {
    return 'warning';
  }
  return 'info';
}

/**
 * 应用房型和房态筛选后重新查询。
 */
function searchRooms(): void {
  appliedRoomTypeId.value = filterRoomTypeId.value;
  appliedRoomStatus.value = filterRoomStatus.value;
  void loadRooms();
}

/**
 * 清空筛选后重新查询全部房间。
 */
function resetRoomFilter(): void {
  filterRoomTypeId.value = '';
  filterRoomStatus.value = '';
  appliedRoomTypeId.value = '';
  appliedRoomStatus.value = '';
  void loadRooms();
}

/**
 * 打开新建房间。
 */
function openCreate(): void {
  editingRoom.value = null;
  dialogVisible.value = true;
}

/**
 * 打开编辑房间。
 */
function openEdit(roomRow: RoomRow): void {
  editingRoom.value = roomRow;
  dialogVisible.value = true;
}

/**
 * 按拖动后的编号顺序保存房间。失败时重新查询。
 */
async function saveRoomSort(idList: string[]): Promise<void> {
  roomList.value = idList.flatMap((recordId) => {
    const roomRow = roomList.value.find((item) => item.id === recordId);
    if (isEmpty(roomRow)) {
      return [];
    }
    return [roomRow];
  });
  try {
    await http.put(HotelApi.ROOMS_SORT, { idList });
  } catch (error) {
    void error;
    await loadRooms();
  }
}

onMounted(() => {
  void loadRooms();
});
</script>

<style scoped>
.room-toolbar {
  margin-bottom: 12px;
}

.record-list {
  margin-top: 16px;
}

.name-box {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}

.drag-icon {
  display: inline-flex;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  padding: 0;
  color: #98a2b3;
  cursor: move;
  background: transparent;
  border: none;
}

.drag-icon svg {
  width: 16px;
  height: 16px;
}
</style>
