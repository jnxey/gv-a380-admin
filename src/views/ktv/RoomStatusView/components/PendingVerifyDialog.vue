<template>
  <el-dialog v-model="visible" title="分配包厢" :width="dialogWidth" align-center>
    <div v-if="isEmpty(order) !== true" class="room-status-pending-meta">
      <div>{{ order.username }} · {{ order.roomTypeName }}</div>
      <div>{{ order.bookingDate }} {{ formatClock(order.startTime) }} - {{ formatBookingEnd(order) }}</div>
    </div>
    <div v-if="isEmpty(freeRoomList)" class="room-status-empty">该时段没有空闲包厢</div>
    <el-form v-else label-position="top">
      <el-form-item label="包厢">
        <el-select v-model="verifyRoomId" style="width: 100%">
          <el-option
            v-for="freeRoom in freeRoomList"
            :key="freeRoom.id"
            :label="`${freeRoom.roomNo} ${freeRoom.roomName}`"
            :value="freeRoom.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="room-status-open-actions">
        <el-button size="large" :disabled="saving" @click="visible = false">取消</el-button>
        <el-button size="large" type="primary" :loading="saving" :disabled="isEmpty(freeRoomList)" @click="submitPendingVerify">确认核销</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { KtvApi } from '../../../../api/ktv';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useSaving } from '../../../../hooks/saving';
import { isEmpty } from '../../../../utils/tools';
import http from '../../../../utils/request';

export interface PendingVerifyOrder {
  bookingOrderId: string;
  username: string;
  roomTypeName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
}

interface FreeRoomOption {
  id: string;
  roomNo: string;
  roomName: string;
}

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  order: PendingVerifyOrder | null;
}>();
const emit = defineEmits<{
  saved: [];
}>();

const { saving, runSaving } = useSaving();
const verifyRoomId = ref('');
const freeRoomList = ref<FreeRoomOption[]>([]);
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');
const dialogWidth = ref('420px');

/**
 * 把钟点收成 HH:mm。
 */
function formatClock(timeText: string): string {
  if (timeText.length >= 5) {
    return timeText.slice(0, 5);
  }
  return timeText;
}

/**
 * 结束钟点不晚于开唱钟点时，表示已经跨到第二天。
 */
function formatBookingEnd(orderRow: PendingVerifyOrder): string {
  const endClock = formatClock(orderRow.endTime);
  if (orderRow.endTime <= orderRow.startTime) {
    return `次日 ${endClock}`;
  }
  return endClock;
}

/**
 * 窄屏时弹窗跟页面差不多宽，宽屏固定 420。
 */
function syncDialogWidth(): void {
  dialogWidth.value = narrowScreenQuery.matches ? '92%' : '420px';
}

/**
 * 打开弹窗后拉取该时段还能分配的包厢。
 */
async function loadFreeRooms(): Promise<void> {
  verifyRoomId.value = '';
  freeRoomList.value = [];
  if (isEmpty(props.order)) {
    return;
  }
  freeRoomList.value = (await http.get(KtvApi.bookingOrderFreeRooms(props.order.bookingOrderId))) as FreeRoomOption[];
  if (isEmpty(freeRoomList.value) !== true) {
    verifyRoomId.value = freeRoomList.value[0].id;
  }
}

/**
 * 把选中的空闲包厢写入订单并核销开房。
 */
async function submitPendingVerify(): Promise<void> {
  if (isEmpty(props.order)) {
    return;
  }
  if (isEmpty(verifyRoomId.value)) {
    ElMessage.warning('请选择包厢');
    return;
  }
  await runSaving(async () => {
    await http.post(KtvApi.bookingOrderVerify(props.order!.bookingOrderId), {
      roomId: verifyRoomId.value,
    });
    ElMessage.success('核销成功，已开包厢');
    visible.value = false;
    emit('saved');
  });
}

watch(visible, (isVisible) => {
  if (isVisible !== true) {
    return;
  }
  void loadFreeRooms();
});

onMounted(() => {
  syncDialogWidth();
  narrowScreenQuery.addEventListener('change', syncDialogWidth);
});

onBeforeUnmount(() => {
  narrowScreenQuery.removeEventListener('change', syncDialogWidth);
});
</script>

<style scoped>
.room-status-pending-meta {
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 22px;
  color: #344054;
}

.room-status-empty {
  color: #98a2b3;
  font-size: 14px;
  line-height: 22px;
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
