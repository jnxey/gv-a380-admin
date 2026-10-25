<template>
  <el-dialog v-model="visible" :title="openRoomTitle" :width="dialogWidth" align-center>
    <div v-if="isEmpty(room) !== true" class="room-status-open-room" :class="roomStatusCardClass(room.roomStatus)">
      <div class="room-status-open-no">{{ room.roomNo }}</div>
      <div class="room-status-open-meta">
        {{ room.roomName }}
        <template v-if="isEmpty(hourlyPrice) !== true"> · {{ hourlyPrice }}/小时</template>
        · {{ roomStatusLabel(room.roomStatus) }}
      </div>
    </div>
    <div class="room-status-verify-label">核销码</div>
    <div class="room-status-verify">
      <el-input v-model="verifyCode" class="room-status-verify-input" size="large" clearable placeholder="扫码或手动输入" />
      <ScanButton type="warning" size="large" class="room-status-verify-scan" aria-label="扫码" @scanned="onVerifyCodeScanned" />
    </div>
    <template v-if="isEmpty(verifyCode.trim())">
      <div class="room-status-verify-label room-status-duration-label">演唱时长</div>
      <el-radio-group v-model="occupyDurationHours" class="room-status-duration">
        <el-radio-button v-for="hourCount in KtvOccupyDuration.HOUR_LIST" :key="hourCount" :value="hourCount">{{ hourCount }} 小时</el-radio-button>
      </el-radio-group>
    </template>
    <p class="room-status-verify-hint">有预约就扫核销码；线下开包厢不填核销码，请选择 {{ KtvOccupyDuration.HOUR_LIST.join('、') }} 小时。</p>
    <template #footer>
      <div class="room-status-open-actions">
        <el-button size="large" :disabled="saving" @click="visible = false">取消</el-button>
        <el-button size="large" type="primary" :loading="saving" @click="submitOpenRoom">确认开包厢</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { KtvApi } from '../../../../api/ktv';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import ScanButton from '../../../../components/ScanButton/ScanButton.vue';
import { useSaving } from '../../../../hooks/saving';
import { KtvOccupyDuration, KtvOrderStatus, KtvRoomStatus, PageSetting } from '../../../../utils/constants';
import { isEmpty } from '../../../../utils/tools';
import http from '../../../../utils/request';

export interface OpenRoomRow {
  id: string;
  roomNo: string;
  roomName: string;
  roomTypeId: string;
  roomStatus: string;
}

interface PendingOrder {
  bookingOrderId: string;
  verifyCode: string;
  orderStatus: string;
}

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  room: OpenRoomRow | null;
  hourlyPrice: string;
  canSave: boolean;
}>();
const emit = defineEmits<{
  saved: [reloadPending: boolean];
}>();

const { saving, runSaving } = useSaving();
const verifyCode = ref('');
const occupyDurationHours = ref<number | undefined>(undefined);
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');
const dialogWidth = ref('420px');

/**
 * 开包厢弹窗标题带上当前包厢编号。还没选中包厢时只显示开包厢。
 */
const openRoomTitle = computed(() => {
  if (isEmpty(props.room)) {
    return '开包厢';
  }
  return `开包厢 · ${props.room.roomNo}`;
});

/**
 * 包厢运营状态的中文。
 */
function roomStatusLabel(roomStatus: string): string {
  if (roomStatus === KtvRoomStatus.IDLE) {
    return '空闲';
  }
  if (roomStatus === KtvRoomStatus.IN_USE) {
    return '使用中';
  }
  if (roomStatus === KtvRoomStatus.CLEANING) {
    return '打扫中';
  }
  if (roomStatus === KtvRoomStatus.MAINTENANCE) {
    return '维修中';
  }
  if (roomStatus === KtvRoomStatus.CLOSED) {
    return '临时关闭';
  }
  return roomStatus;
}

/**
 * 包厢运营状态对应的卡片底色。
 */
function roomStatusCardClass(roomStatus: string): string {
  if (roomStatus === KtvRoomStatus.IDLE) {
    return 'is-idle';
  }
  if (roomStatus === KtvRoomStatus.IN_USE) {
    return 'is-in-use';
  }
  if (roomStatus === KtvRoomStatus.CLEANING) {
    return 'is-cleaning';
  }
  if (roomStatus === KtvRoomStatus.MAINTENANCE) {
    return 'is-maintenance';
  }
  if (roomStatus === KtvRoomStatus.CLOSED) {
    return 'is-closed';
  }
  return '';
}

/**
 * 窄屏时弹窗跟页面差不多宽，宽屏固定 420。
 */
function syncDialogWidth(): void {
  dialogWidth.value = narrowScreenQuery.matches ? '92%' : '420px';
}

/**
 * 扫核销码写入输入框。
 */
function onVerifyCodeScanned(scannedVerifyCode: string): void {
  verifyCode.value = scannedVerifyCode;
}

/**
 * 线下演唱时长必须是可选小时里的一档。
 */
function isOccupyDurationHours(durationHours: number | undefined): boolean {
  if (isEmpty(durationHours)) {
    return false;
  }
  return KtvOccupyDuration.HOUR_LIST.some((hourCount) => hourCount === durationHours);
}

/**
 * 开包厢。填写核销码就核销对应订单；不填则按线下开包厢，直接改成使用中。
 */
async function submitOpenRoom(): Promise<void> {
  if (isEmpty(props.room)) {
    return;
  }
  const verifyCodeText = verifyCode.value.trim();
  if (isEmpty(verifyCodeText)) {
    if (props.canSave !== true) {
      ElMessage.warning('请填写核销码');
      return;
    }
    if (isOccupyDurationHours(occupyDurationHours.value) !== true) {
      ElMessage.warning(`请选择${KtvOccupyDuration.HOUR_LIST.join('、')}小时`);
      return;
    }
    await runSaving(async () => {
      await http.put(KtvApi.roomStatus(props.room!.id), {
        roomStatus: KtvRoomStatus.IN_USE,
        durationHours: occupyDurationHours.value,
      });
      ElMessage.success('开包厢成功');
      visible.value = false;
      verifyCode.value = '';
      occupyDurationHours.value = undefined;
      emit('saved', false);
    });
    return;
  }
  await runSaving(async () => {
    const pageResult = (await http.get(KtvApi.BOOKING_ORDERS, {
      params: {
        verifyCode: verifyCodeText,
        page: PageSetting.DEFAULT_PAGE,
        pageSize: PageSetting.DEFAULT_PAGE_SIZE,
      },
    })) as { list: PendingOrder[] };
    const pendingOrder = pageResult.list.find((bookingOrder) => {
      return bookingOrder.verifyCode === verifyCodeText && bookingOrder.orderStatus === KtvOrderStatus.PENDING_VERIFY;
    });
    if (isEmpty(pendingOrder)) {
      ElMessage.warning('没有找到待核销订单');
      return;
    }
    await http.post(KtvApi.bookingOrderVerify(pendingOrder.bookingOrderId), {
      roomId: props.room!.id,
    });
    ElMessage.success('开包厢成功');
    visible.value = false;
    verifyCode.value = '';
    emit('saved', true);
  });
}

watch(visible, (isVisible) => {
  if (isVisible !== true) {
    return;
  }
  verifyCode.value = '';
  occupyDurationHours.value = undefined;
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

.room-status-open-room.is-in-use {
  background: #b56a08;
}

.room-status-open-room.is-cleaning {
  background: #217eae;
}

.room-status-open-room.is-maintenance {
  background: #b84545;
}

.room-status-open-room.is-closed {
  background: #5e6772;
}

.room-status-verify-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: #1c2434;
}

.room-status-verify {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-status-verify-input {
  flex: 1;
}

.room-status-verify-scan {
  height: 40px;
  margin: 0;
  border-radius: 8px;
  font-weight: 600;
}

.room-status-verify-scan svg {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  vertical-align: -3px;
}

.room-status-duration-label {
  margin-top: 16px;
}

.room-status-duration {
  display: flex;
  width: 100%;
}

.room-status-duration :deep(.el-radio-button) {
  flex: 1;
}

.room-status-duration :deep(.el-radio-button__inner) {
  width: 100%;
  padding-left: 0;
  padding-right: 0;
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
