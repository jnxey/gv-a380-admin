<template>
  <ShopSwitcher />
  <el-card>
    <el-button v-if="canSave" type="primary" @click="openCreate">新建房型</el-button>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(roomTypeList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="roomTypeRow in roomTypeList" :key="roomTypeRow.id">
        <RecordField label="房型">{{ roomTypeRow.typeName }}</RecordField>
        <RecordField label="床型">{{ roomTypeRow.bedType === HotelBedType.TWIN ? '双床' : '大床' }}</RecordField>
        <RecordField label="每晚价格">{{ roomTypeRow.price }}</RecordField>
        <RecordField label="状态">
          <el-tag :type="roomTypeRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(roomTypeRow.status) }}
          </el-tag>
        </RecordField>
        <template v-if="canSave" #actions>
          <el-button link type="primary" @click="openEdit(roomTypeRow)">编辑</el-button>
        </template>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="dialogVisible" :title="editingId === '' ? '新建房型' : '编辑房型'" width="480px">
      <el-form label-position="top">
        <el-form-item label="名称"><el-input v-model="roomTypeForm.typeName" /></el-form-item>
        <el-form-item label="床型">
          <el-select v-model="roomTypeForm.bedType">
            <el-option label="大床" :value="HotelBedType.LARGE" />
            <el-option label="双床" :value="HotelBedType.TWIN" />
          </el-select>
        </el-form-item>
        <el-form-item label="每晚价格"><el-input v-model="roomTypeForm.price" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="roomTypeForm.status">
            <el-option label="启用" :value="RecordStatus.ENABLED" />
            <el-option label="停用" :value="RecordStatus.DISABLED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="saveRoomType">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { HotelBedType, PageSetting, PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface RoomTypeRow {
  id: string;
  typeName: string;
  bedType: string;
  price: string;
  status: string;
}

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.HOTEL_ROOM_TYPE_SAVE);
const roomTypeList = ref<RoomTypeRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);
const dialogVisible = ref(false);
const editingId = ref('');
const roomTypeForm = reactive({
  typeName: '',
  bedType: HotelBedType.LARGE as string,
  price: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 查询当前酒店房型。
 */
async function loadRoomTypes(): Promise<void> {
  const pageResult = (await http.get('/admin/hotel/room-types', {
    params: { page: page.value, pageSize: pageSize.value },
  })) as { list: RoomTypeRow[]; total: number };
  roomTypeList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 打开新建房型。
 */
function openCreate(): void {
  editingId.value = '';
  roomTypeForm.typeName = '';
  roomTypeForm.bedType = HotelBedType.LARGE;
  roomTypeForm.price = '';
  roomTypeForm.status = RecordStatus.ENABLED;
  dialogVisible.value = true;
}

/**
 * 打开编辑房型。
 */
function openEdit(roomTypeRow: RoomTypeRow): void {
  editingId.value = roomTypeRow.id;
  roomTypeForm.typeName = roomTypeRow.typeName;
  roomTypeForm.bedType = roomTypeRow.bedType;
  roomTypeForm.price = roomTypeRow.price;
  roomTypeForm.status = roomTypeRow.status;
  dialogVisible.value = true;
}

/**
 * 保存房型。
 */
async function saveRoomType(): Promise<void> {
  if (isEmpty(editingId.value)) {
    await http.post('/admin/hotel/room-types', roomTypeForm);
  } else {
    await http.put(`/admin/hotel/room-types/${editingId.value}`, roomTypeForm);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  await loadRoomTypes();
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadRoomTypes();
}

onMounted(() => {
  void loadRoomTypes();
});
</script>

<style scoped>
.record-list {
  margin-top: 16px;
}
</style>
