<template>
  <el-dialog v-model="visible" :title="extendTitle" width="420px" align-center>
    <div v-if="isEmpty(room) !== true" class="room-status-open-room" :class="roomStatusCardClass(room.roomStatus)">
      <div class="room-status-open-no">{{ room.roomNo }}</div>
      <div class="room-status-open-meta">{{ roomMeta }}</div>
    </div>
    <el-date-picker v-model="extendDate" type="date" value-format="YYYY-MM-DD" placeholder="新的离店日期" />
    <p class="room-status-verify-hint">新的离店日期必须晚于当前离店日期。续住和退房都不扣款。</p>
    <template #footer>
      <div class="room-status-open-actions">
        <el-button size="large" :disabled="saving" @click="visible = false">取消</el-button>
        <el-button size="large" type="primary" :loading="saving" @click="submitExtend">确认续住</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { HotelApi } from '../../../api/hotel';
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useSaving } from '../../../hooks/saving';
import { HotelRoomStatus } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

export interface ExtendStayRoomRow {
  id: string;
  roomNo: string;
  roomStatus: string;
}

const visible = defineModel<boolean>({ required: true });
const extendDate = defineModel<string>('extendDate', { required: true });
const props = defineProps<{
  room: ExtendStayRoomRow | null;
  roomMeta: string;
  bookingOrderId: string;
}>();
const emit = defineEmits<{
  saved: [];
}>();

const { saving, runSaving } = useSaving();

/**
 * 续住弹窗标题。
 */
const extendTitle = computed(() => {
  if (isEmpty(props.room)) {
    return '续住';
  }
  return `${props.room.roomNo} 续住`;
});

/**
 * 房态卡片底色。
 */
function roomStatusCardClass(roomStatus: string): string {
  if (roomStatus === HotelRoomStatus.IDLE) {
    return 'is-idle';
  }
  if (roomStatus === HotelRoomStatus.OCCUPIED) {
    return 'is-occupied';
  }
  if (roomStatus === HotelRoomStatus.CLEANING) {
    return 'is-cleaning';
  }
  if (roomStatus === HotelRoomStatus.MAINTENANCE) {
    return 'is-maintenance';
  }
  return '';
}

/**
 * 确认续住。新的离店日必须晚于当前离店日。
 */
async function submitExtend(): Promise<void> {
  if (isEmpty(props.bookingOrderId)) {
    ElMessage.warning('没有找到在住订单');
    return;
  }
  if (isEmpty(extendDate.value)) {
    ElMessage.warning('请选择新的离店日期');
    return;
  }
  await runSaving(async () => {
    await http.post(HotelApi.bookingOrderExtend(props.bookingOrderId), { checkOutDate: extendDate.value });
    ElMessage.success('已续住');
    visible.value = false;
    emit('saved');
  });
}
</script>

<style scoped>
.room-status-open-room {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  color: #fff;
}

.room-status-open-no {
  font-size: 22px;
  font-weight: 600;
  line-height: 28px;
}

.room-status-open-meta {
  margin-top: 2px;
  font-size: 13px;
  line-height: 20px;
}

.room-status-open-room.is-idle {
  background: #248a4a;
}

.room-status-open-room.is-occupied {
  background: #b56a08;
}

.room-status-open-room.is-cleaning {
  background: #217eae;
}

.room-status-open-room.is-maintenance {
  background: #b84545;
}

.room-status-verify-hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: #667085;
}

.room-status-open-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}

.room-status-open-actions .el-button {
  flex: 1;
  margin: 0;
}
</style>
