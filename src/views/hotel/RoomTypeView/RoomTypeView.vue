<template>
  <ShopSwitcher />
  <el-card>
    <div v-if="isEmpty(roomTypeList) && canSave !== true" class="room-type-empty">暂无数据</div>
    <div v-else ref="sortListRef" class="room-type-grid">
      <button v-if="canSave" type="button" class="room-type-card room-type-create" @click="openCreate">
        <span class="room-type-create-plus">+</span>
        <span>新建房型</span>
      </button>
      <article v-for="roomTypeRow in roomTypeList" :key="roomTypeRow.id" class="room-type-card">
        <div class="room-type-cover">
          <img v-if="!isEmpty(coverImageUrl(roomTypeRow))" :src="coverImageUrl(roomTypeRow)" alt="" />
          <span v-else class="room-type-cover-empty">暂无图片</span>
        </div>
        <div class="room-type-body">
          <div class="room-type-name name-box" :data-key="roomTypeRow.id">
            <button v-if="canSave" type="button" class="drag-icon">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  fill="currentColor"
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M5.33333 5.33335C6.06971 5.33335 6.66667 4.7364 6.66667 4.00002C6.66667 3.26364 6.06971 2.66669 5.33333 2.66669C4.59695 2.66669 4 3.26364 4 4.00002C4 4.7364 4.59695 5.33335 5.33333 5.33335ZM10.6667 5.33335C11.403 5.33335 12 4.7364 12 4.00002C12 3.26364 11.403 2.66669 10.6667 2.66669C9.93029 2.66669 9.33333 3.26364 9.33333 4.00002C9.33333 4.7364 9.93029 5.33335 10.6667 5.33335ZM6.66667 8.00002C6.66667 8.7364 6.06971 9.33335 5.33333 9.33335C4.59695 9.33335 4 8.7364 4 8.00002C4 7.26364 4.59695 6.66669 5.33333 6.66669C6.06971 6.66669 6.66667 7.26364 6.66667 8.00002ZM10.6667 9.33335C11.403 9.33335 12 8.7364 12 8.00002C12 7.26364 11.403 6.66669 10.6667 6.66669C9.93029 6.66669 9.33333 7.26364 9.33333 8.00002C9.33333 8.7364 9.93029 9.33335 10.6667 9.33335ZM6.66667 12C6.66667 12.7364 6.06971 13.3334 5.33333 13.3334C4.59695 13.3334 4 12.7364 4 12C4 11.2636 4.59695 10.6667 5.33333 10.6667C6.06971 10.6667 6.66667 11.2636 6.66667 12ZM10.6667 13.3334C11.403 13.3334 12 12.7364 12 12C12 11.2636 11.403 10.6667 10.6667 10.6667C9.93029 10.6667 9.33333 11.2636 9.33333 12C9.33333 12.7364 9.93029 13.3334 10.6667 13.3334Z"
                />
              </svg>
            </button>
            <span>{{ roomTypeRow.typeName }}</span>
          </div>
          <div class="room-type-meta">{{ roomTypeRow.price }}</div>
          <div class="room-type-foot">
            <el-tag :type="roomTypeRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
              {{ statusLabel(roomTypeRow.status) }}
            </el-tag>
            <el-button v-if="canSave" link type="primary" @click="openEdit(roomTypeRow)">编辑</el-button>
          </div>
        </div>
      </article>
    </div>
    <RoomTypeDialog v-model="dialogVisible" :room-type="editingRoomType" @saved="loadRoomTypes" />
  </el-card>
</template>

<script setup lang="ts">
import { HotelApi } from '../../../api/hotel';
import { onMounted, ref } from 'vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import { useDragSort } from '../../../hooks/drag-sort';
import RoomTypeDialog, { type RoomTypeRow } from './RoomTypeDialog.vue';

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.HOTEL_ROOM_TYPE_SAVE);
const roomTypeList = ref<RoomTypeRow[]>([]);
const sortListRef = ref<HTMLElement | null>(null);
const dialogVisible = ref(false);
const editingRoomType = ref<RoomTypeRow | null>(null);
const { initDragSort } = useDragSort(
  () => sortListRef.value,
  () => canSave === true,
  saveRoomTypeSort,
);

/**
 * 封面用第一张房型图片。没有图片时返回空字符串。
 */
function coverImageUrl(roomTypeRow: RoomTypeRow): string {
  if (isEmpty(roomTypeRow.imageList)) {
    return '';
  }
  return roomTypeRow.imageList[0].imageUrl;
}

/**
 * 查询当前门店全部房型。
 */
async function loadRoomTypes(): Promise<void> {
  const pageResult = (await http.get(HotelApi.ROOM_TYPES)) as { list: RoomTypeRow[] };
  roomTypeList.value = pageResult.list;
  await initDragSort();
}

/**
 * 打开新建房型。
 */
function openCreate(): void {
  editingRoomType.value = null;
  dialogVisible.value = true;
}

/**
 * 打开编辑房型。
 */
function openEdit(roomTypeRow: RoomTypeRow): void {
  editingRoomType.value = roomTypeRow;
  dialogVisible.value = true;
}

/**
 * 按拖动后的编号顺序保存房型。失败时重新查询。
 */
async function saveRoomTypeSort(idList: string[]): Promise<void> {
  roomTypeList.value = idList.flatMap((recordId) => {
    const roomTypeRow = roomTypeList.value.find((item) => item.id === recordId);
    if (isEmpty(roomTypeRow)) {
      return [];
    }
    return [roomTypeRow];
  });
  try {
    await http.put(HotelApi.ROOM_TYPES_SORT, { idList });
  } catch (error) {
    void error;
    await loadRoomTypes();
  }
}

onMounted(() => {
  void loadRoomTypes();
});
</script>

<style scoped>
.room-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.room-type-card {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.room-type-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  background: #f4f6f8;
}

.room-type-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.room-type-cover-empty {
  font-size: 13px;
  color: #909399;
}

.room-type-body {
  padding: 12px;
}

.room-type-create {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 240px;
  padding: 0;
  font: inherit;
  font-size: 14px;
  color: #667085;
  cursor: pointer;
  background: #ffffff;
  border: 1px dashed #c8cdd4;
}

.room-type-create-plus {
  font-size: 32px;
  line-height: 1;
  color: #98a2b3;
}

.room-type-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  font-weight: 600;
  color: #1c2434;
  word-break: break-word;
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

.room-type-meta {
  margin-top: 4px;
  font-size: 13px;
  color: #667085;
  word-break: break-word;
}

.room-type-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.room-type-empty {
  color: #909399;
}
</style>
