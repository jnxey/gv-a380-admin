<template>
  <aside class="room-status-orders">
    <div class="room-status-order-stat">
      <span class="room-status-order-stat-label">已预订</span>
      <span class="room-status-order-stat-count">{{ bookedOrderList.length }}</span>
    </div>
    <div v-if="bookedTypeCountList.length > 0" class="room-status-order-types">
      <span v-for="bookedTypeCount in bookedTypeCountList" :key="bookedTypeCount.roomTypeId" class="room-status-order-type">
        {{ bookedTypeCount.typeName }} {{ bookedTypeCount.count }}
      </span>
    </div>
    <div v-for="roomTypeWarning in roomTypeWarningList" :key="roomTypeWarning.roomTypeId" class="room-status-warning">
      {{ roomTypeWarning.warningText }}
    </div>
    <div v-if="bookedOrderList.length === 0" class="room-status-empty">暂无已预订订单</div>
    <article v-for="bookedOrder in bookedOrderList" :key="bookedOrder.bookingOrderId" class="room-status-order">
      <div class="room-status-order-head">
        <div class="room-status-order-name">{{ guestText(bookedOrder) }}</div>
        <button v-if="canCheckIn" type="button" class="room-status-order-handle" @click="emit('handle', bookedOrder)">办理</button>
      </div>
      <div v-if="isEmpty(bookedOrder.contact) !== true" class="room-status-order-line">{{ bookedOrder.contact }}</div>
      <div class="room-status-order-line">{{ bookedOrder.typeName }}</div>
      <div class="room-status-order-line">{{ formatLocalDateTime(bookedOrder.checkInDate) }} 至 {{ formatLocalDateTime(bookedOrder.checkOutDate) }}</div>
    </article>
  </aside>
</template>

<script setup lang="ts">
import { formatLocalDateTime, isEmpty } from '../../../utils/tools';

export interface BookedOrderItem {
  bookingOrderId: string;
  username: string;
  contact: string;
  guestName: string;
  typeName: string;
  checkInDate: string;
  checkOutDate: string;
}

export interface BookedTypeCountItem {
  roomTypeId: string;
  typeName: string;
  count: number;
}

export interface RoomTypeWarningItem {
  roomTypeId: string;
  warningText: string;
}

defineProps<{
  bookedOrderList: BookedOrderItem[];
  bookedTypeCountList: BookedTypeCountItem[];
  roomTypeWarningList: RoomTypeWarningItem[];
  canCheckIn: boolean;
}>();

const emit = defineEmits<{
  handle: [bookedOrder: BookedOrderItem];
}>();

/**
 * 订单上要显示的客人。先用预定人，没有时用账号，再没有用联系方式。
 */
function guestText(orderRow: BookedOrderItem): string {
  if (isEmpty(orderRow.guestName) !== true) {
    return orderRow.guestName;
  }
  if (isEmpty(orderRow.username) !== true) {
    return orderRow.username;
  }
  return isEmpty(orderRow.contact) ? '' : orderRow.contact;
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

.room-status-order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.room-status-order-handle {
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
  color: #2563eb;
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
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
