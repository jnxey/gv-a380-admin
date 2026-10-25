<template>
  <article class="room-status-card" :class="roomStatusCardClass(room.roomStatus)">
    <div class="room-status-actions">
      <button
        v-if="room.roomStatus === HotelRoomStatus.CLEANING && canCheckOut"
        type="button"
        class="room-status-flow"
        title="空闲"
        @click="emit('finish-cleaning')"
      >
        <AppIcon class="room-status-flow-icon" :icon-name="MenuIconName.KTV_ROOM_IDLE" />
      </button>
      <el-popover v-if="moreStatusOptionList.length > 0" trigger="click" placement="bottom-end" :width="120">
        <div class="room-status-more-list">
          <button
            v-for="roomStatusOption in moreStatusOptionList"
            :key="roomStatusOption.value"
            type="button"
            class="room-status-more-item"
            @click="emit('change-status', roomStatusOption.value)"
          >
            <span class="room-status-more-dot" :class="roomStatusCardClass(roomStatusOption.value)" />
            {{ roomStatusOption.label }}
          </button>
        </div>
        <template #reference>
          <button type="button" class="room-status-more" title="更多状态">
            <AppIcon class="room-status-more-icon" :icon-name="MenuIconName.MORE" />
          </button>
        </template>
      </el-popover>
    </div>
    <div class="room-status-no">{{ room.roomNo }}</div>
    <div class="room-status-name">
      {{ typeName }}
      <template v-if="isEmpty(nightPrice) !== true"> · {{ nightPrice }}/晚</template>
    </div>
    <div class="room-status-text">{{ statusLabel(room.roomStatus) }}</div>
    <div v-if="isEmpty(guestName) !== true" class="room-status-name">{{ guestName }}</div>
    <div
      v-if="isEmpty(checkOutText) !== true || (room.roomStatus === HotelRoomStatus.OCCUPIED && (canExtend || canCheckOut))"
      class="room-status-occupy-line"
    >
      <span v-if="isEmpty(checkOutText) !== true" class="room-status-occupy">{{ checkOutText }}</span>
      <button
        v-if="room.roomStatus === HotelRoomStatus.OCCUPIED && canExtend"
        type="button"
        class="room-status-extend"
        @click="emit('extend')"
      >
        续住
      </button>
      <button
        v-if="room.roomStatus === HotelRoomStatus.OCCUPIED && canCheckOut"
        type="button"
        class="room-status-extend"
        @click="emit('check-out')"
      >
        退房
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '../../../../components/AppIcon/AppIcon.vue';
import { HotelRoomStatus, MenuIconName, statusLabel } from '../../../../utils/constants';
import { isEmpty } from '../../../../utils/tools';

export interface HotelRoomStatusCardRow {
  id: string;
  roomNo: string;
  roomTypeId: string;
  roomStatus: string;
}

interface RoomStatusOption {
  value: string;
  label: string;
}

const props = defineProps<{
  room: HotelRoomStatusCardRow;
  typeName: string;
  nightPrice: string;
  guestName: string;
  checkOutText: string;
  canSave: boolean;
  canExtend: boolean;
  canCheckOut: boolean;
}>();

const emit = defineEmits<{
  'finish-cleaning': [];
  extend: [];
  'check-out': [];
  'change-status': [roomStatus: string];
}>();

const manualStatusOptionList: RoomStatusOption[] = [
  { value: HotelRoomStatus.IDLE, label: statusLabel(HotelRoomStatus.IDLE) },
  { value: HotelRoomStatus.CLEANING, label: statusLabel(HotelRoomStatus.CLEANING) },
  { value: HotelRoomStatus.MAINTENANCE, label: statusLabel(HotelRoomStatus.MAINTENANCE) },
];

/**
 * 更多操作可在空闲、打扫中和维修之间切换。在住必须先退房，没有保存权限时不出现。
 */
const moreStatusOptionList = computed(() => {
  if (props.canSave !== true || props.room.roomStatus === HotelRoomStatus.OCCUPIED) {
    return [];
  }
  return manualStatusOptionList.filter((roomStatusOption) => roomStatusOption.value !== props.room.roomStatus);
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
</script>

<style scoped>
.room-status-card {
  position: relative;
  padding: 12px 44px 12px 12px;
  border-radius: 8px;
}

.room-status-card.is-idle {
  background: #248a4a;
}

.room-status-card.is-occupied {
  background: #b56a08;
}

.room-status-card.is-cleaning {
  background: #217eae;
}

.room-status-card.is-maintenance {
  background: #b84545;
}

.room-status-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.room-status-flow,
.room-status-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: #1c2434;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.72);
  border: 0;
  border-radius: 6px;
}

.room-status-flow:hover,
.room-status-more:hover {
  color: #1c2434;
  background: rgba(255, 255, 255, 0.92);
}

.room-status-flow-icon {
  width: 18px;
  height: 18px;
}

.room-status-more-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
  stroke: none;
}

.room-status-name {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  color: #fff;
}

.room-status-no {
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: #fff;
}

.room-status-text {
  margin-top: 12px;
  font-size: 13px;
  line-height: 20px;
  color: #fff;
}

.room-status-occupy-line {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  margin-top: 4px;
}

.room-status-occupy-line .room-status-occupy,
.room-status-occupy-line .room-status-extend {
  margin-top: 0;
  white-space: nowrap;
}

.room-status-occupy {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: #fff;
}

.room-status-extend {
  margin-top: 0;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  color: #1c2434;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.72);
  border: 0;
  border-radius: 6px;
}

.room-status-extend:hover {
  background: rgba(255, 255, 255, 0.92);
}

.room-status-more-list {
  display: flex;
  flex-direction: column;
}

.room-status-more-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  font-size: 13px;
  line-height: 20px;
  color: #1c2434;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.room-status-more-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.room-status-more-dot.is-idle {
  background: #248a4a;
}

.room-status-more-dot.is-occupied {
  background: #b56a08;
}

.room-status-more-dot.is-cleaning {
  background: #217eae;
}

.room-status-more-dot.is-maintenance {
  background: #b84545;
}

.room-status-more-item:hover {
  color: #2563eb;
}

@media (max-width: 768px) {
  .room-status-occupy-line {
    flex-wrap: wrap;
  }
}
</style>
