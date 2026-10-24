<template>
  <el-dialog v-model="visible" :title="isEmpty(room) ? '新建包厢' : '编辑包厢'" width="480px">
    <el-form label-position="top">
      <el-form-item label="编号"><el-input v-model="roomForm.roomNo" /></el-form-item>
      <el-form-item label="名称"><el-input v-model="roomForm.roomName" /></el-form-item>
      <el-form-item label="类型">
        <el-select v-model="roomForm.roomTypeId">
          <el-option v-for="roomType in selectableRoomTypeList" :key="roomType.id" :label="roomType.typeName" :value="roomType.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="人数"><el-input v-model.number="roomForm.capacity" /></el-form-item>
      <el-form-item label="状态">
        <el-select v-model="roomForm.status">
          <el-option label="启用" :value="RecordStatus.ENABLED" />
          <el-option label="停用" :value="RecordStatus.DISABLED" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button size="large" :disabled="saving" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" :loading="saving" @click="saveRoom">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { KtvApi } from '../../../api/ktv';
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useSaving } from '../../../hooks/saving';
import { RecordStatus } from '../../../utils/constants';
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
  roomName: string;
  roomTypeId: string;
  capacity: number;
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
const { saving, runSaving } = useSaving();
const roomForm = reactive({
  roomNo: '',
  roomName: '',
  roomTypeId: '',
  capacity: 4,
  status: RecordStatus.ENABLED as string,
});

/**
 * 类型下拉：启用中的类型。编辑时若当前类型已停用，仍保留这一项。
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
 * 打开时按传入的包厢填表。新建时清空，类型默认第一项启用类型。
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
    const firstEnabledRoomType = props.roomTypeList.find((roomType) => roomType.status === RecordStatus.ENABLED);
    roomForm.roomTypeId = isEmpty(firstEnabledRoomType) ? '' : firstEnabledRoomType.id;
    roomForm.capacity = 4;
    roomForm.status = RecordStatus.ENABLED;
    return;
  }
  editingRoomId.value = roomRow.id;
  roomForm.roomNo = roomRow.roomNo;
  roomForm.roomName = roomRow.roomName;
  roomForm.roomTypeId = roomRow.roomTypeId;
  roomForm.capacity = roomRow.capacity;
  roomForm.status = roomRow.status;
}

/**
 * 保存包厢到当前门店。
 */
async function saveRoom(): Promise<void> {
  if (isEmpty(roomForm.roomNo)) {
    ElMessage.warning('请填写编号');
    return;
  }
  if (isEmpty(roomForm.roomName)) {
    ElMessage.warning('请填写名称');
    return;
  }
  if (isEmpty(roomForm.roomTypeId)) {
    ElMessage.warning('请选择类型');
    return;
  }
  const capacityNumber = Number(roomForm.capacity);
  if (Number.isFinite(capacityNumber) !== true || capacityNumber <= 0) {
    ElMessage.warning('人数必须大于0');
    return;
  }
  await runSaving(async () => {
    if (isEmpty(editingRoomId.value)) {
      await http.post(KtvApi.ROOMS, roomForm);
    } else {
      await http.put(KtvApi.room(editingRoomId.value), roomForm);
    }
    ElMessage.success('保存成功');
    visible.value = false;
    emit('saved');
  });
}
</script>
