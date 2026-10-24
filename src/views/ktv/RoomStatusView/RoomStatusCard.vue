<template>
  <article class="room-status-card" :class="roomStatusCardClass(room.roomStatus)">
    <div class="room-status-actions">
      <button
        v-if="room.roomStatus === KtvRoomStatus.IDLE && (canVerify || canSave)"
        type="button"
        class="room-status-flow"
        title="开包厢"
        @click="emit('open')"
      >
        <AppIcon class="room-status-flow-icon" :icon-name="MenuIconName.KTV_ROOM_OPEN" />
      </button>
      <button
        v-else-if="room.roomStatus === KtvRoomStatus.IN_USE && canSave"
        type="button"
        class="room-status-flow"
        title="打扫中"
        @click="emit('change-status', KtvRoomStatus.CLEANING)"
      >
        <AppIcon class="room-status-flow-icon" :icon-name="MenuIconName.KTV_ROOM_CLEAN" />
      </button>
      <button
        v-else-if="room.roomStatus === KtvRoomStatus.CLEANING && canSave"
        type="button"
        class="room-status-flow"
        title="空闲"
        @click="emit('change-status', KtvRoomStatus.IDLE)"
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
            @click="emit('more-status', roomStatusOption.value)"
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
      {{ room.roomName }}
      <template v-if="isEmpty(hourlyPrice) !== true"> {{ hourlyPrice }}/小时</template>
    </div>
    <div class="room-status-text">{{ roomStatusLabel(room.roomStatus) }}</div>
    <div
      v-if="isEmpty(occupyEndText) !== true || isEmpty(extendHourText) !== true || (room.roomStatus === KtvRoomStatus.IN_USE && canVerify)"
      class="room-status-occupy-line"
    >
      <span v-if="isEmpty(occupyEndText) !== true" class="room-status-occupy">{{ occupyEndText }}</span>
      <span v-if="isEmpty(extendHourText) !== true" class="room-status-occupy">{{ extendHourText }}</span>
      <button
        v-if="room.roomStatus === KtvRoomStatus.IN_USE && canVerify"
        type="button"
        class="room-status-extend"
        @click="emit('extend')"
      >
        延长
      </button>
    </div>
    <div v-if="isEmpty(occupyRemindText) !== true" class="room-status-occupy">{{ occupyRemindText }}</div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import { KtvRoomStatus, MenuIconName } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';

export interface RoomStatusCardRow {
  id: string;
  roomNo: string;
  roomName: string;
  roomTypeId: string;
  roomStatus: string;
}

interface RoomStatusOption {
  value: string;
  label: string;
}

const props = defineProps<{
  room: RoomStatusCardRow;
  hourlyPrice: string;
  occupyEndText: string;
  extendHourText: string;
  occupyRemindText: string;
  canSave: boolean;
  canVerify: boolean;
}>();

const emit = defineEmits<{
  open: [];
  extend: [];
  'change-status': [roomStatus: string];
  'more-status': [roomStatus: string];
}>();

const roomStatusOptionList: RoomStatusOption[] = [
  { value: KtvRoomStatus.IDLE, label: '空闲' },
  { value: KtvRoomStatus.IN_USE, label: '使用中' },
  { value: KtvRoomStatus.CLEANING, label: '打扫中' },
  { value: KtvRoomStatus.MAINTENANCE, label: '维修中' },
  { value: KtvRoomStatus.CLOSED, label: '临时关闭' },
];

/**
 * 更多操作列出除当前状态以外的可选状态。使用中仅空闲可开；没有保存权限时不出现其余状态。
 */
const moreStatusOptionList = computed(() => {
  return roomStatusOptionList.filter((roomStatusOption) => {
    if (roomStatusOption.value === props.room.roomStatus) {
      return false;
    }
    if (roomStatusOption.value === KtvRoomStatus.IN_USE) {
      return props.room.roomStatus === KtvRoomStatus.IDLE && (props.canVerify || props.canSave);
    }
    return props.canSave;
  });
});

/**
 * 包厢运营状态的中文。
 */
function roomStatusLabel(roomStatus: string): string {
  const roomStatusOption = roomStatusOptionList.find((item) => item.value === roomStatus);
  if (isEmpty(roomStatusOption)) {
    return roomStatus;
  }
  return roomStatusOption.label;
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

.room-status-card.is-in-use {
  background: #b56a08;
}

.room-status-card.is-cleaning {
  background: #217eae;
}

.room-status-card.is-maintenance {
  background: #b84545;
}

.room-status-card.is-closed {
  background: #5e6772;
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

.room-status-more-dot.is-in-use {
  background: #b56a08;
}

.room-status-more-dot.is-cleaning {
  background: #217eae;
}

.room-status-more-dot.is-maintenance {
  background: #b84545;
}

.room-status-more-dot.is-closed {
  background: #5e6772;
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
