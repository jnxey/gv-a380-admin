<template>
  <el-card>
    <el-button v-if="canSave" type="primary" @click="openCreate">新建房间</el-button>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(roomList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="roomRow in roomList" :key="roomRow.id">
        <RecordField label="房号">{{ roomRow.roomNo }}</RecordField>
        <RecordField label="楼层">{{ roomRow.floorNo }}</RecordField>
        <RecordField label="房型ID">{{ roomRow.roomTypeId }}</RecordField>
        <RecordField label="房态">{{ statusLabel(roomRow.roomStatus) }}</RecordField>
        <template v-if="canSave" #actions>
          <el-button link type="primary" @click="openEdit(roomRow)">编辑</el-button>
        </template>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="dialogVisible" :title="editingRoomId === '' ? '新建房间' : '编辑房间'" width="480px">
      <el-form label-width="80px">
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
import RecordCard from '../../components/RecordCard.vue';
import RecordField from '../../components/RecordField.vue';
import { HotelRoomStatus, PageSetting, PermissionCode, statusLabel } from '../../utils/constants';
import { isEmpty } from '../../utils/tools';
import { useSessionStore } from '../../stores/session';
import http from '../../utils/request';

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
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);
const dialogVisible = ref(false);
const editingRoomId = ref('');
const roomForm = reactive({
  roomTypeId: '',
  roomNo: '',
  floorNo: '',
  roomStatus: HotelRoomStatus.IDLE as string,
});

/**
 * 查询房间和房型。
 */
async function loadRooms(): Promise<void> {
  const roomPage = (await http.get('/admin/hotel/rooms', { params: { page: page.value, pageSize: pageSize.value } })) as {
    list: RoomRow[];
    total: number;
  };
  const roomTypePage = (await http.get('/admin/hotel/room-types', {
    params: { page: PageSetting.DEFAULT_PAGE, pageSize: PageSetting.ROOM_LOOKUP_PAGE_SIZE },
  })) as { list: RoomTypeRow[] };
  roomList.value = roomPage.list;
  total.value = roomPage.total;
  roomTypeList.value = roomTypePage.list;
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
