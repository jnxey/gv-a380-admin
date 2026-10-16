<template>
  <el-dialog v-model="visible" :title="isEmpty(room) ? '新建包厢' : '编辑包厢'" width="480px">
    <el-form label-position="top">
      <el-form-item label="编号"><el-input v-model="roomForm.roomNo" /></el-form-item>
      <el-form-item label="名称"><el-input v-model="roomForm.roomName" /></el-form-item>
      <el-form-item label="类型">
        <el-select v-model="roomForm.roomTypeId">
          <el-option v-for="roomType in roomTypeList" :key="roomType.id" :label="roomType.typeName" :value="roomType.id" />
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
      <el-button size="large" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" @click="saveRoom">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { RecordStatus } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

export interface RoomTypeOption {
  id: string;
  typeName: string;
}

export interface RoomRow {
  id: string;
  roomNo: string;
  roomName: string;
  roomTypeId: string;
  capacity: number;
  price: string;
  status: string;
}

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  room: RoomRow | null;
  roomTypeList: RoomTypeOption[];
}>();
const emit = defineEmits<{
  saved: [];
}>();

const editingRoomId = ref('');
const roomForm = reactive({
  roomNo: '',
  roomName: '',
  roomTypeId: '',
  capacity: 4,
  price: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 打开时按传入的包厢填表。新建时清空，类型默认第一项。
 */
watch(visible, (opened) => {
  if (opened !== true) {
    return;
  }
  fillRoomForm(props.room);
});

/**
 * 把包厢记录写进表单。
 */
function fillRoomForm(roomRow: RoomRow | null): void {
  if (isEmpty(roomRow)) {
    editingRoomId.value = '';
    roomForm.roomNo = '';
    roomForm.roomName = '';
    roomForm.roomTypeId = isEmpty(props.roomTypeList[0]) ? '' : props.roomTypeList[0].id;
    roomForm.capacity = 4;
    roomForm.price = '';
    roomForm.status = RecordStatus.ENABLED;
    return;
  }
  editingRoomId.value = roomRow.id;
  roomForm.roomNo = roomRow.roomNo;
  roomForm.roomName = roomRow.roomName;
  roomForm.roomTypeId = roomRow.roomTypeId;
  roomForm.capacity = roomRow.capacity;
  roomForm.price = roomRow.price;
  roomForm.status = roomRow.status;
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
  visible.value = false;
  emit('saved');
}
</script>
