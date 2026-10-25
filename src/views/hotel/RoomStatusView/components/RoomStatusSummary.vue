<template>
  <div class="room-status-summary">
    <span
      v-for="roomStatusCount in countList"
      :key="roomStatusCount.value"
      class="room-status-count"
      :class="roomStatusCardClass(roomStatusCount.value)"
    >
      <span class="room-status-count-label">{{ roomStatusCount.label }}</span>
      <span class="room-status-count-value">{{ roomStatusCount.count }}</span>
    </span>
    <button type="button" class="room-status-deduct" @click="emit('deduct')">
      <AppIcon class="room-status-deduct-icon" :icon-name="MenuIconName.FINANCE_BILL" />
      付款
    </button>
    <button type="button" class="room-status-refresh" title="刷新" @click="emit('refresh')">
      <AppIcon class="room-status-refresh-icon" :icon-name="MenuIconName.REFRESH" />
    </button>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '../../../../components/AppIcon/AppIcon.vue';
import { HotelRoomStatus, MenuIconName } from '../../../../utils/constants';

export interface RoomStatusCountItem {
  value: string;
  label: string;
  count: number;
}

defineProps<{
  countList: RoomStatusCountItem[];
}>();

const emit = defineEmits<{
  deduct: [];
  refresh: [];
}>();

/**
 * 房态统计条底色。
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
</script>

<style scoped>
.room-status-summary {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.room-status-count {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  color: #fff;
  white-space: nowrap;
}

.room-status-count-value,
.room-status-count-label {
  display: inline-flex;
  align-items: center;
  height: 28px;
  line-height: 1;
}

.room-status-count-value {
  font-size: 22px;
  font-weight: 600;
  transform: translateY(-2px);
}

.room-status-count-label {
  font-size: 12px;
  font-weight: 500;
}

.room-status-deduct,
.room-status-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  height: auto;
  padding: 0 10px;
  cursor: pointer;
  border: 0;
  border-radius: 8px;
}

.room-status-deduct {
  padding: 0 14px;
  color: #ffffff;
  background: #2563eb;
  font-size: 14px;
  font-weight: 600;
}

.room-status-deduct:hover {
  background: #1d4ed8;
}

.room-status-refresh {
  color: #1c2434;
  background: #e4e7ec;
}

.room-status-refresh:hover {
  background: #d5d9e0;
}

.room-status-deduct-icon,
.room-status-refresh-icon {
  width: 18px;
  height: 18px;
}

.room-status-deduct-icon {
  margin-right: 6px;
}

.room-status-count.is-idle {
  background: #248a4a;
}

.room-status-count.is-occupied {
  background: #b56a08;
}

.room-status-count.is-cleaning {
  background: #217eae;
}

.room-status-count.is-maintenance {
  background: #b84545;
}

@media (max-width: 768px) {
  .room-status-summary {
    flex-wrap: wrap;
  }
}
</style>
