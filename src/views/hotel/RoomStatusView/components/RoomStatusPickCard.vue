<template>
  <article
    class="room-status-card room-status-pick-card"
    :class="{ 'is-selected': selected }"
    @click="emit('select')"
  >
    <div class="room-status-no">{{ room.roomNo }}</div>
    <div class="room-status-name">
      {{ typeName }}
      <template v-if="isEmpty(nightPrice) !== true"> · {{ nightPrice }}/晚</template>
    </div>
    <div class="room-status-text">{{ selected ? '已选' : statusLabel(room.roomStatus) }}</div>
  </article>
</template>

<script setup lang="ts">
import { statusLabel } from '../../../../utils/constants';
import { isEmpty } from '../../../../utils/tools';

export interface PickRoomRow {
  id: string;
  roomNo: string;
  roomStatus: string;
}

defineProps<{
  room: PickRoomRow;
  typeName: string;
  nightPrice: string;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [];
}>();
</script>

<style scoped>
.room-status-card {
  position: relative;
  padding: 12px 12px;
  border-radius: 8px;
}

.room-status-pick-card {
  cursor: pointer;
  background: #d8f3e3;
  color: #145c32;
}

.room-status-pick-card .room-status-no,
.room-status-pick-card .room-status-name,
.room-status-pick-card .room-status-text {
  color: #145c32;
}

.room-status-pick-card.is-selected {
  background: #145c32;
  color: #fff;
}

.room-status-pick-card.is-selected .room-status-no,
.room-status-pick-card.is-selected .room-status-name,
.room-status-pick-card.is-selected .room-status-text {
  color: #fff;
}

.room-status-name {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
}

.room-status-no {
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.room-status-text {
  margin-top: 12px;
  font-size: 13px;
  line-height: 20px;
}
</style>
