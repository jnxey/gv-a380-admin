<template>
  <el-dialog v-model="visible" :title="isEmpty(room) ? '新建房间' : '编辑房间'" width="480px">
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
          <el-option label="打扫中" :value="HotelRoomStatus.CLEANING" />
          <el-option label="维修" :value="HotelRoomStatus.MAINTENANCE" />
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
import { HotelRoomStatus } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

export interface RoomTypeOption {
  id: string;
  typeName: string;
}

export interface RoomRow {
  id: string;
  roomNo: string;
  floorNo: string;
  roomTypeId: string;
  roomStatus: string;
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
  roomTypeId: '',
  roomNo: '',
  floorNo: '',
  roomStatus: HotelRoomStatus.IDLE as string,
});

/**
 * 打开时按传入的房间填表。新建时清空，房型默认第一项。
 */
watch(visible, (opened) => {
  if (opened !== true) {
    return;
  }
  fillRoomForm(props.room);
});

/**
 * 把房间记录写进表单。
 */
function fillRoomForm(roomRow: RoomRow | null): void {
  if (isEmpty(roomRow)) {
    editingRoomId.value = '';
    roomForm.roomTypeId = isEmpty(props.roomTypeList[0]) ? '' : props.roomTypeList[0].id;
    roomForm.roomNo = '';
    roomForm.floorNo = '';
    roomForm.roomStatus = HotelRoomStatus.IDLE;
    return;
  }
  editingRoomId.value = roomRow.id;
  roomForm.roomTypeId = roomRow.roomTypeId;
  roomForm.roomNo = roomRow.roomNo;
  roomForm.floorNo = roomRow.floorNo;
  roomForm.roomStatus = roomRow.roomStatus;
}

/**
 * 保存房间到当前门店。
 */
async function saveRoom(): Promise<void> {
  if (isEmpty(editingRoomId.value)) {
    await http.post('/admin/hotel/rooms', roomForm);
  } else {
    await http.put(`/admin/hotel/rooms/${editingRoomId.value}`, roomForm);
  }
  ElMessage.success('保存成功');
  visible.value = false;
  emit('saved');
}
</script>
