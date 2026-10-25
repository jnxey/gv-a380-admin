<template>
  <el-dialog v-model="visible" title="办理入住" width="420px" align-center>
    <div v-if="isEmpty(room) !== true" class="room-status-open-room" :class="roomStatusCardClass(room.roomStatus)">
      <div class="room-status-open-no">{{ room.roomNo }}</div>
      <div class="room-status-open-meta">
        {{ room.floorNo }}层
        <template v-if="isEmpty(typeName) !== true"> · {{ typeName }}</template>
        <template v-if="isEmpty(nightPrice) !== true"> · {{ nightPrice }}/晚</template>
      </div>
    </div>
    <template v-if="isEmpty(todayOrder) !== true">
      <div class="room-status-check-in-line">预定人 {{ todayOrder.guestName }}</div>
      <div class="room-status-check-in-line">联系方式 {{ todayOrder.contact }}</div>
      <div class="room-status-check-in-line">
        {{ formatLocalDateTime(todayOrder.checkInDate) }} 至 {{ formatLocalDateTime(todayOrder.checkOutDate) }}
      </div>
    </template>
    <template v-else>
      <div class="room-status-check-in-line">联系方式 {{ searchedContact }}</div>
      <div class="room-status-check-in-line">入住时间 {{ walkInCheckInDateText }}</div>
      <div class="room-status-check-in-line">{{ walkInNightCountText }} 晚</div>
    </template>
    <template #footer>
      <div class="room-status-open-actions">
        <el-button size="large" :disabled="saving" @click="visible = false">取消</el-button>
        <el-button size="large" type="primary" :loading="saving" @click="submitCheckIn">确认入住</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { HotelApi } from '../../../../api/hotel';
import { ElMessage } from 'element-plus';
import { useSaving } from '../../../../hooks/saving';
import { HotelRoomStatus } from '../../../../utils/constants';
import { formatLocalDateTime, isEmpty } from '../../../../utils/tools';
import http from '../../../../utils/request';

export interface CheckInRoomRow {
  id: string;
  roomNo: string;
  floorNo: string;
  roomStatus: string;
}

export interface CheckInTodayOrder {
  bookingOrderId: string;
  guestName: string;
  contact: string;
  checkInDate: string;
  checkOutDate: string;
}

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  room: CheckInRoomRow | null;
  todayOrder: CheckInTodayOrder | null;
  searchedContact: string;
  walkInCheckInDateText: string;
  walkInNightCountText: string;
  walkInNightCount: number | null;
  typeName: string;
  nightPrice: string;
}>();
const emit = defineEmits<{
  saved: [];
}>();

const { saving, runSaving } = useSaving();

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
 * 确认入住。对上今天的预定就办理该订单；没有订单时按今天为这位客人入住。
 */
async function submitCheckIn(): Promise<void> {
  if (isEmpty(props.room)) {
    return;
  }
  await runSaving(async () => {
    if (isEmpty(props.todayOrder) !== true) {
      await http.post(HotelApi.bookingOrderCheckIn(props.todayOrder.bookingOrderId), { roomId: props.room!.id });
    } else {
      if (isEmpty(props.searchedContact) || props.walkInNightCount === null) {
        ElMessage.warning('请填写联系方式和入住晚数');
        return;
      }
      await http.post(HotelApi.roomWalkIn(props.room!.id), {
        contact: props.searchedContact,
        nightCount: props.walkInNightCount,
      });
    }
    ElMessage.success('已入住');
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

.room-status-check-in-line {
  margin-top: 8px;
  font-size: 13px;
  line-height: 20px;
  color: #1c2434;
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
