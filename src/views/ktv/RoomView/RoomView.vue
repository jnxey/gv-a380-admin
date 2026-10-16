<template>
  <ShopSwitcher />
  <el-card>
    <el-button v-if="canSave" type="primary" @click="openCreate">新建包厢</el-button>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(roomList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="roomRow in roomList" :key="roomRow.id">
        <RecordField label="名称">{{ roomRow.roomName }}</RecordField>
        <RecordField label="编号">{{ roomRow.roomNo }}</RecordField>
        <RecordField label="类型">{{ roomTypeName(roomRow.roomTypeId) }}</RecordField>
        <RecordField label="人数">{{ roomRow.capacity }}</RecordField>
        <RecordField label="价格">{{ roomRow.price }}</RecordField>
        <RecordField label="状态">
          <el-tag :type="roomRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(roomRow.status) }}
          </el-tag>
        </RecordField>
        <template v-if="canSave" #actions>
          <el-button link type="primary" @click="openEdit(roomRow)">编辑</el-button>
        </template>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <RoomDialog v-model="dialogVisible" :room="editingRoom" :room-type-list="roomTypeList" @saved="loadRooms" />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ListPager from '../../../components/ListPager/ListPager.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { PageSetting, PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import RoomDialog, { type RoomRow, type RoomTypeOption } from './RoomDialog.vue';

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.KTV_ROOM_SAVE);
const roomList = ref<RoomRow[]>([]);
const roomTypeList = ref<RoomTypeOption[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);
const dialogVisible = ref(false);
const editingRoom = ref<RoomRow | null>(null);

/**
 * 分页查询当前门店包厢，并加载包厢类型名称。
 */
async function loadRooms(): Promise<void> {
  const pageResult = (await http.get('/admin/ktv/rooms', {
    params: { page: page.value, pageSize: pageSize.value },
  })) as { list: RoomRow[]; total: number };
  const roomTypePage = (await http.get('/admin/ktv/room-types')) as { list: RoomTypeOption[] };
  roomList.value = pageResult.list;
  total.value = pageResult.total;
  roomTypeList.value = roomTypePage.list;
}

/**
 * 用类型编号换成类型名称。
 */
function roomTypeName(roomTypeId: string): string {
  const roomType = roomTypeList.value.find((item) => item.id === roomTypeId);
  if (isEmpty(roomType)) {
    return '';
  }
  return roomType.typeName;
}

/**
 * 打开新建包厢。
 */
function openCreate(): void {
  editingRoom.value = null;
  dialogVisible.value = true;
}

/**
 * 打开编辑包厢。
 */
function openEdit(roomRow: RoomRow): void {
  editingRoom.value = roomRow;
  dialogVisible.value = true;
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadRooms();
}

onMounted(() => {
  void loadRooms();
});
</script>

<style scoped>
.record-list {
  margin-top: 16px;
}
</style>
