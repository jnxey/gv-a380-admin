<template>
  <el-dialog v-model="visible" :title="isEmpty(room) ? '新建房间' : '编辑房间'" width="480px">
    <el-form label-position="top">
      <el-form-item label="房型">
        <el-select v-model="roomForm.roomTypeId">
          <el-option v-for="roomType in selectableRoomTypeList" :key="roomType.id" :label="roomType.typeName" :value="roomType.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="房号"><el-input v-model="roomForm.roomNo" /></el-form-item>
      <el-form-item label="楼层"><el-input v-model="roomForm.floorNo" /></el-form-item>
      <el-form-item label="房态">
        <el-radio-group v-model="roomForm.roomStatus" :disabled="roomStatusLocked">
          <el-radio v-if="roomStatusLocked" :value="HotelRoomStatus.OCCUPIED">在住</el-radio>
          <el-radio :value="HotelRoomStatus.IDLE">空闲</el-radio>
          <el-radio :value="HotelRoomStatus.CLEANING">打扫中</el-radio>
          <el-radio :value="HotelRoomStatus.MAINTENANCE">维修</el-radio>
        </el-radio-group>
      </el-form-item>
      <div v-if="roomStatusLocked" class="room-status-tip">在住房请在房态页退房后再改房态</div>
    </el-form>
    <template #footer>
      <el-button size="large" :disabled="saving" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" :loading="saving" @click="saveRoom">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { HotelApi } from '../../../api/hotel';
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useSaving } from '../../../hooks/saving';
import { HotelRoomStatus, RecordStatus } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

export interface RoomTypeOption {
  id: string;
  typeName: string;
  status: string;
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
const { saving, runSaving } = useSaving();
const roomForm = reactive({
  roomTypeId: '',
  roomNo: '',
  floorNo: '',
  roomStatus: HotelRoomStatus.IDLE as string,
});

/**
 * 类型下拉：启用中的房型。编辑时若当前房型已停用，仍保留这一项。
 */
const selectableRoomTypeList = computed(() => {
  return props.roomTypeList.filter((roomType) => {
    if (roomType.status === RecordStatus.ENABLED) {
      return true;
    }
    return roomType.id === roomForm.roomTypeId;
  });
});

/**
 * 在住房不能在管理页改房态，避免绕过退房流程。
 */
const roomStatusLocked = computed(() => {
  return roomForm.roomStatus === HotelRoomStatus.OCCUPIED;
});

/**
 * 打开时按传入的房间填表。新建时清空，房型默认第一项启用房型。
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
    const firstEnabledRoomType = props.roomTypeList.find((roomType) => roomType.status === RecordStatus.ENABLED);
    roomForm.roomTypeId = isEmpty(firstEnabledRoomType) ? '' : firstEnabledRoomType.id;
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
 * 保存房间到当前门店。在住房只保留原房态，不能在管理页改成在住。
 */
async function saveRoom(): Promise<void> {
  if (isEmpty(roomForm.roomTypeId)) {
    ElMessage.warning('请选择房型');
    return;
  }
  if (isEmpty(roomForm.roomNo)) {
    ElMessage.warning('请填写房号');
    return;
  }
  if (isEmpty(roomForm.floorNo)) {
    ElMessage.warning('请填写楼层');
    return;
  }
  if (
    roomForm.roomStatus !== HotelRoomStatus.IDLE &&
    roomForm.roomStatus !== HotelRoomStatus.CLEANING &&
    roomForm.roomStatus !== HotelRoomStatus.MAINTENANCE &&
    roomStatusLocked.value !== true
  ) {
    ElMessage.warning('房态不正确');
    return;
  }
  await runSaving(async () => {
    if (isEmpty(editingRoomId.value)) {
      await http.post(HotelApi.ROOMS, roomForm);
    } else {
      await http.put(HotelApi.room(editingRoomId.value), roomForm);
    }
    ElMessage.success('保存成功');
    visible.value = false;
    emit('saved');
  });
}
</script>

<style scoped>
.room-status-tip {
  margin-top: -8px;
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 18px;
  color: #667085;
}
</style>
