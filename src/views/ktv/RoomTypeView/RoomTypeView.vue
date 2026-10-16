<template>
  <ShopSwitcher />
  <el-card>
    <div v-if="isEmpty(roomTypeList) && canSave !== true" class="room-type-empty">暂无数据</div>
    <div v-else class="room-type-grid">
      <button v-if="canSave" type="button" class="room-type-card room-type-create" @click="openCreate">
        <span class="room-type-create-plus">+</span>
        <span>新建类型</span>
      </button>
      <article v-for="roomTypeRow in roomTypeList" :key="roomTypeRow.id" class="room-type-card">
        <div class="room-type-cover">
          <img v-if="!isEmpty(coverImageUrl(roomTypeRow))" :src="coverImageUrl(roomTypeRow)" alt="" />
          <span v-else class="room-type-cover-empty">暂无图片</span>
        </div>
        <div class="room-type-body">
          <div class="room-type-name">{{ roomTypeRow.typeName }}</div>
          <div class="room-type-meta">{{ roomTypeRow.hourlyPrice }}</div>
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
import { onMounted, ref } from 'vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import RoomTypeDialog, { type RoomTypeRow } from './RoomTypeDialog.vue';

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.KTV_ROOM_TYPE_SAVE);
const roomTypeList = ref<RoomTypeRow[]>([]);
const dialogVisible = ref(false);
const editingRoomType = ref<RoomTypeRow | null>(null);

/**
 * 封面用第一张类型图片。没有图片时返回空字符串。
 */
function coverImageUrl(roomTypeRow: RoomTypeRow): string {
  if (isEmpty(roomTypeRow.imageList)) {
    return '';
  }
  return roomTypeRow.imageList[0].imageUrl;
}

/**
 * 查询当前门店全部包厢类型。
 */
async function loadRoomTypes(): Promise<void> {
  const pageResult = (await http.get('/admin/ktv/room-types')) as { list: RoomTypeRow[] };
  roomTypeList.value = pageResult.list;
}

/**
 * 打开新建包厢类型。
 */
function openCreate(): void {
  editingRoomType.value = null;
  dialogVisible.value = true;
}

/**
 * 打开编辑包厢类型。
 */
function openEdit(roomTypeRow: RoomTypeRow): void {
  editingRoomType.value = roomTypeRow;
  dialogVisible.value = true;
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
  font-size: 16px;
  font-weight: 600;
  color: #1c2434;
  word-break: break-word;
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
