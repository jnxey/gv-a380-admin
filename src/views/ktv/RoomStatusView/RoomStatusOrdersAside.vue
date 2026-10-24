<template>
  <aside class="room-status-orders">
    <div v-if="isEmpty(occupyRemindRoomList) !== true" class="room-status-due">
      <div class="room-status-order-stat">
        <span class="room-status-order-stat-label">即将到点</span>
        <span class="room-status-order-stat-count">{{ occupyRemindRoomList.length }}</span>
      </div>
      <article v-for="occupyRemindRoom in occupyRemindRoomList" :key="occupyRemindRoom.roomId" class="room-status-order">
        <div class="room-status-order-name">{{ occupyRemindRoom.roomNo }} {{ occupyRemindRoom.roomName }}</div>
        <div class="room-status-order-line">{{ occupyRemindRoom.remindText }}</div>
      </article>
    </div>
    <div class="room-status-order-stat">
      <span class="room-status-order-stat-label">待核销</span>
      <span class="room-status-order-stat-count">{{ pendingBookingList.length }}</span>
    </div>
    <div v-if="isEmpty(pendingTypeCountList) !== true" class="room-status-order-types">
      <span v-for="pendingTypeCount in pendingTypeCountList" :key="pendingTypeCount.roomTypeId" class="room-status-order-type">
        {{ pendingTypeCount.typeName }} {{ pendingTypeCount.count }}
      </span>
    </div>
    <div v-for="roomTypeWarning in roomTypeWarningList" :key="roomTypeWarning.roomTypeId" class="room-status-warning">
      {{ roomTypeWarning.warningText }}
    </div>
    <div v-if="isEmpty(pendingBookingList)" class="room-status-empty">暂无待核销订单</div>
    <article v-for="pendingOrder in pendingBookingList" :key="pendingOrder.bookingOrderId" class="room-status-order">
      <div class="room-status-order-name">{{ pendingOrder.username }}</div>
      <div class="room-status-order-line">{{ pendingOrder.roomTypeName }}</div>
      <div class="room-status-order-line">{{ pendingOrder.bookingDate }} {{ formatClock(pendingOrder.startTime) }} - {{ formatBookingEnd(pendingOrder) }}</div>
      <div class="room-status-order-line">核销码 {{ VerifyCodeMask }}</div>
      <div v-if="canVerify" class="room-status-order-actions">
        <el-button link type="primary" @click="emit('verify', pendingOrder)">办理</el-button>
      </div>
    </article>
  </aside>
</template>

<script setup lang="ts">
import { VerifyCodeMask } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';

export interface OccupyRemindRoomItem {
  roomId: string;
  roomNo: string;
  roomName: string;
  remindText: string;
}

export interface PendingBookingOrderItem {
  bookingOrderId: string;
  username: string;
  roomTypeId: string;
  roomTypeName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
}

export interface PendingTypeCountItem {
  roomTypeId: string;
  typeName: string;
  count: number;
}

export interface RoomTypeWarningItem {
  roomTypeId: string;
  warningText: string;
}

defineProps<{
  occupyRemindRoomList: OccupyRemindRoomItem[];
  pendingBookingList: PendingBookingOrderItem[];
  pendingTypeCountList: PendingTypeCountItem[];
  roomTypeWarningList: RoomTypeWarningItem[];
  canVerify: boolean;
}>();

const emit = defineEmits<{
  verify: [pendingOrder: PendingBookingOrderItem];
}>();

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
function formatBookingEnd(pendingOrder: PendingBookingOrderItem): string {
  const endClock = formatClock(pendingOrder.endTime);
  if (pendingOrder.endTime <= pendingOrder.startTime) {
    return `次日 ${endClock}`;
  }
  return endClock;
}
</script>

<style scoped>
.room-status-orders {
  width: 280px;
  flex-shrink: 0;
  overflow: auto;
  padding-left: 12px;
  border-left: 1px solid #e6e8ec;
}

.room-status-due {
  margin-bottom: 16px;
}

.room-status-order-stat {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.room-status-order-stat-label {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
}

.room-status-order-stat-count {
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
  color: #1c2434;
}

.room-status-order-types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.room-status-order-type {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f4f6f8;
  font-size: 12px;
  line-height: 20px;
  color: #344054;
}

.room-status-warning {
  margin-top: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #fdecea;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: #b42318;
}

.room-status-order {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e6e8ec;
}

.room-status-order-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
}

.room-status-order-line {
  margin-top: 2px;
  font-size: 13px;
  line-height: 20px;
  color: #344054;
}

.room-status-order-actions {
  margin-top: 8px;
}

.room-status-empty {
  color: #909399;
}

@media (max-width: 768px) {
  .room-status-orders {
    flex: none;
    width: auto;
    min-height: auto;
    overflow: visible;
    margin-top: 16px;
    padding-top: 16px;
    padding-left: 0;
    border-top: 1px solid #e6e8ec;
    border-left: 0;
  }
}
</style>
