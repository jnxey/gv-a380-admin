<template>
  <el-card>
    <el-button v-if="canSave" type="primary" @click="openCreate">新建包厢</el-button>
    <el-table :data="roomList" stripe class="table">
      <el-table-column prop="roomNo" label="编号" min-width="120" />
      <el-table-column prop="roomName" label="名称" min-width="140" />
      <el-table-column label="类型" min-width="120">
        <template #default="scope">{{ statusLabel(scope.row.roomType) }}</template>
      </el-table-column>
      <el-table-column prop="capacity" label="人数" min-width="100" />
      <el-table-column prop="price" label="价格" min-width="120" />
      <el-table-column label="状态" min-width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="canSave" label="操作" min-width="100">
        <template #default="scope">
          <el-button link type="primary" @click="openEdit(scope.row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="dialogVisible" :title="editingRoomId === '' ? '新建包厢' : '编辑包厢'" width="480px">
      <el-form label-width="80px">
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
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRoom">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ListPager from '../../components/ListPager.vue';
import { KtvRoomType, PageSetting, PermissionCode, RecordStatus, statusLabel } from '../../utils/constants';
import { isEmpty } from '../../utils/tools';
import { useSessionStore } from '../../stores/session';
import http from '../../utils/request';

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
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);
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
 * 查询当前门店包厢。
 */
async function loadRooms(): Promise<void> {
  const pageResult = (await http.get('/admin/ktv/rooms', { params: { page: page.value, pageSize: pageSize.value } })) as {
    list: RoomRow[];
    total: number;
  };
  roomList.value = pageResult.list;
  total.value = pageResult.total;
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
.table {
  margin-top: 16px;
}
</style>
