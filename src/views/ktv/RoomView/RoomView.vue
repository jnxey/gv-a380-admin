<template>
  <ShopSwitcher />
  <el-card>
    <div v-if="isEmpty(roomList) && canSave !== true" class="room-empty">暂无数据</div>
    <div v-else class="room-grid">
      <button v-if="canSave" type="button" class="room-card room-create" @click="openCreate">
        <span class="room-create-plus">+</span>
        <span>新建包厢</span>
      </button>
      <article v-for="roomRow in roomList" :key="roomRow.id" class="room-card">
        <div class="room-name">{{ roomRow.roomName }}</div>
        <div class="room-meta">{{ roomRow.roomNo }} · {{ statusLabel(roomRow.roomType) }} · {{ roomRow.capacity }}人</div>
        <div class="room-price">{{ roomRow.price }}</div>
        <div class="room-foot">
          <el-tag :type="roomRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(roomRow.status) }}
          </el-tag>
          <el-button v-if="canSave" link type="primary" @click="openEdit(roomRow)">编辑</el-button>
        </div>
      </article>
    </div>
    <el-dialog v-model="dialogVisible" :title="editingRoomId === '' ? '新建包厢' : '编辑包厢'" width="480px">
      <el-form label-position="top">
        <el-form-item label="编号"><el-input v-model="roomForm.roomNo" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="roomForm.roomName" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="roomForm.roomType">
            <el-option label="小包" :value="KtvRoomType.SMALL" />
            <el-option label="中包" :value="KtvRoomType.MEDIUM" />
            <el-option label="大包" :value="KtvRoomType.LARGE" />
          </el-select>
        </el-form-item>
        <el-form-item label="人数"><el-input v-model.number="roomForm.capacity" /></el-form-item>
        <el-form-item label="价格"><el-input v-model="roomForm.price" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="roomForm.status">
            <el-option label="启用" :value="RecordStatus.ENABLED" />
            <el-option label="停用" :value="RecordStatus.DISABLED" />
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
import { KtvRoomType, PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface RoomRow {
  id: string;
  roomNo: string;
  roomName: string;
  roomType: string;
  capacity: number;
  price: string;
  status: string;
}

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.KTV_ROOM_SAVE);
const roomList = ref<RoomRow[]>([]);
const dialogVisible = ref(false);
const editingRoomId = ref('');
const roomForm = reactive({
  roomNo: '',
  roomName: '',
  roomType: KtvRoomType.SMALL as string,
  capacity: 4,
  price: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 查询当前门店全部包厢。
 */
async function loadRooms(): Promise<void> {
  const pageResult = (await http.get('/admin/ktv/rooms')) as {
    list: RoomRow[];
  };
  roomList.value = pageResult.list;
}

/**
 * 打开新建包厢。
 */
function openCreate(): void {
  editingRoomId.value = '';
  roomForm.roomNo = '';
  roomForm.roomName = '';
  roomForm.roomType = KtvRoomType.SMALL;
  roomForm.capacity = 4;
  roomForm.price = '';
  roomForm.status = RecordStatus.ENABLED;
  dialogVisible.value = true;
}

/**
 * 打开编辑包厢。
 */
function openEdit(roomRow: RoomRow): void {
  editingRoomId.value = roomRow.id;
  roomForm.roomNo = roomRow.roomNo;
  roomForm.roomName = roomRow.roomName;
  roomForm.roomType = roomRow.roomType;
  roomForm.capacity = roomRow.capacity;
  roomForm.price = roomRow.price;
  roomForm.status = roomRow.status;
  dialogVisible.value = true;
}

/**
 * 保存包厢到当前门店。
 */
async function saveRoom(): Promise<void> {
  if (isEmpty(editingRoomId.value)) {
    await http.post('/admin/ktv/rooms', roomForm);
  } else {
    await http.put(`/admin/ktv/rooms/${editingRoomId.value}`, roomForm);
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

.room-meta,
.room-price {
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
