<template>
  <ShopSwitcher />
  <el-card>
    <div v-if="isEmpty(roomList) && canSave !== true" class="room-empty">暂无数据</div>
    <div v-else class="room-grid">
      <article v-for="roomRow in roomList" :key="roomRow.id" class="room-card">
        <div class="room-name">{{ roomRow.roomNo }}</div>
        <div class="room-meta">
          {{ roomRow.floorNo }}<template v-if="!isEmpty(roomTypeName(roomRow.roomTypeId))"> · {{ roomTypeName(roomRow.roomTypeId) }}</template>
        </div>
        <div class="room-foot">
          <el-tag :type="roomStatusTagType(roomRow.roomStatus)" effect="plain">{{ statusLabel(roomRow.roomStatus) }}</el-tag>
          <el-button v-if="canSave" link type="primary" @click="openEdit(roomRow)">编辑</el-button>
        </div>
      </article>
      <button v-if="canSave" type="button" class="room-card room-create" @click="openCreate">
        <span class="room-create-plus">+</span>
        <span>新建房间</span>
      </button>
    </div>
    <el-dialog v-model="dialogVisible" :title="editingRoomId === '' ? '新建房间' : '编辑房间'" width="480px">
      <el-form label-position="top">
        <el-form-item label="房型">
          <el-select v-model="roomForm.roomTypeId">
            <el-option v-for="roomType in roomTypeList" :key="roomType.id" :label="roomType.typeName" :value="roomType.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="房号"><el-input v-model="roomForm.roomNo" /></el-form-item>
        <el-form-item label="楼层"><el-input v-model="roomForm.floorNo" /></el-form-item>
        <el-form-item label="房态">
          <el-select v-model="roomForm.roomStatus">
            <el-option label="空闲" :value="HotelRoomStatus.IDLE" />
            <el-option label="在住" :value="HotelRoomStatus.OCCUPIED" />
            <el-option label="维修" :value="HotelRoomStatus.MAINTENANCE" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="saveRoom">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { HotelRoomStatus, PageSetting, PermissionCode, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
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
}

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.HOTEL_ROOM_SAVE);
const roomList = ref<RoomRow[]>([]);
const roomTypeList = ref<RoomTypeRow[]>([]);
const dialogVisible = ref(false);
const editingRoomId = ref('');
const roomForm = reactive({
  roomTypeId: '',
  roomNo: '',
  floorNo: '',
  roomStatus: HotelRoomStatus.IDLE as string,
});

/**
 * 查询当前门店全部房间，并加载房型名称。
 */
async function loadRooms(): Promise<void> {
  const roomPage = (await http.get('/admin/hotel/rooms')) as {
    list: RoomRow[];
  };
  const roomTypePage = (await http.get('/admin/hotel/room-types', {
    params: { page: PageSetting.DEFAULT_PAGE, pageSize: PageSetting.ROOM_LOOKUP_PAGE_SIZE },
  })) as { list: RoomTypeRow[] };
  roomList.value = roomPage.list;
  roomTypeList.value = roomTypePage.list;
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
 * 打开新建房间。
 */
function openCreate(): void {
  editingRoomId.value = '';
  roomForm.roomTypeId = isEmpty(roomTypeList.value[0]) ? '' : roomTypeList.value[0].id;
  roomForm.roomNo = '';
  roomForm.floorNo = '';
  roomForm.roomStatus = HotelRoomStatus.IDLE;
  dialogVisible.value = true;
}

/**
 * 打开编辑房间。
 */
function openEdit(roomRow: RoomRow): void {
  editingRoomId.value = roomRow.id;
  roomForm.roomTypeId = roomRow.roomTypeId;
  roomForm.roomNo = roomRow.roomNo;
  roomForm.floorNo = roomRow.floorNo;
  roomForm.roomStatus = roomRow.roomStatus;
  dialogVisible.value = true;
}

/**
 * 保存房间。
 */
async function saveRoom(): Promise<void> {
  if (isEmpty(editingRoomId.value)) {
    await http.post('/admin/hotel/rooms', roomForm);
  } else {
    await http.put(`/admin/hotel/rooms/${editingRoomId.value}`, roomForm);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  await loadRooms();
}

onMounted(() => {
  void loadRooms();
});
</script>

<style scoped>
.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.room-card {
  overflow: hidden;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.room-create {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 148px;
  padding: 0;
  font: inherit;
  font-size: 14px;
  color: #667085;
  cursor: pointer;
  background: #ffffff;
  border: 1px dashed #c8cdd4;
}

.room-create-plus {
  font-size: 32px;
  line-height: 1;
  color: #98a2b3;
}

.room-name {
  font-size: 16px;
  font-weight: 600;
  color: #1c2434;
  word-break: break-word;
}

.room-meta {
  margin-top: 4px;
  font-size: 13px;
  color: #667085;
  word-break: break-word;
}

.room-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.room-empty {
  color: #909399;
}
</style>
