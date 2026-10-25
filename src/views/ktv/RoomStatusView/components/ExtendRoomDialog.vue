<template>
  <el-dialog v-model="visible" :title="extendRoomTitle" :width="dialogWidth" align-center>
    <div v-if="isEmpty(room) !== true" class="room-status-open-room" :class="roomStatusCardClass(room.roomStatus)">
      <div class="room-status-open-no">{{ room.roomNo }}</div>
      <div class="room-status-open-meta">
        {{ room.roomName }}
        <template v-if="isEmpty(occupyEndText) !== true"> · {{ occupyEndText }}</template>
        <template v-if="isEmpty(extendHourText) !== true"> · {{ extendHourText }}</template>
      </div>
    </div>
    <div v-if="isEmpty(room) !== true && isEmpty(occupyEndText) !== true" class="room-status-extend-preview">
      <div>当前到期：{{ occupyEndText }}</div>
      <div>延长后：{{ extendAfterEndText }}</div>
    </div>
    <p class="room-status-verify-hint">每次延长 {{ KtvOccupyDuration.EXTEND_HOURS }} 小时，从当前到期时间往后加。多次延长只累计小时数。</p>
    <template #footer>
      <div class="room-status-open-actions">
        <el-button size="large" :disabled="saving" @click="visible = false">取消</el-button>
        <el-button size="large" type="primary" :loading="saving" @click="submitExtendOccupy">确认延长</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { KtvApi } from '../../../../api/ktv';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useSaving } from '../../../../hooks/saving';
import { KtvOccupyDuration, KtvRoomStatus } from '../../../../utils/constants';
import { extendAfterOccupyEndText } from '../utils/ktv-occupy';
import { isEmpty } from '../../../../utils/tools';
import http from '../../../../utils/request';

export interface ExtendRoomRow {
  id: string;
  roomNo: string;
  roomName: string;
  roomStatus: string;
  occupyEndAt: string | null;
}

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  room: ExtendRoomRow | null;
  occupyEndText: string;
  extendHourText: string;
}>();
const emit = defineEmits<{
  saved: [];
}>();

const { saving, runSaving } = useSaving();
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');
const dialogWidth = ref('420px');

/**
 * 延长弹窗标题。没有选中包厢时只显示延长。
 */
const extendRoomTitle = computed(() => {
  if (isEmpty(props.room)) {
    return '延长';
  }
  return `延长 ${props.room.roomNo}`;
});

/**
 * 延长后的到期文案，按固定延长小时从当前到期往后加。
 */
const extendAfterEndText = computed(() => {
  if (isEmpty(props.room)) {
    return '-';
  }
  return extendAfterOccupyEndText(props.room.occupyEndAt, KtvOccupyDuration.EXTEND_HOURS);
});

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
 * 延长使用中包厢。固定加 1 小时到当前到期时间，并累计延长小时。
 */
async function submitExtendOccupy(): Promise<void> {
  if (isEmpty(props.room)) {
    return;
  }
  await runSaving(async () => {
    await http.post(KtvApi.roomExtendOccupy(props.room!.id), {
      durationHours: KtvOccupyDuration.EXTEND_HOURS,
    });
    ElMessage.success('延长成功');
    visible.value = false;
    emit('saved');
  });
}

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

.room-status-extend-preview {
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 22px;
  color: #344054;
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
