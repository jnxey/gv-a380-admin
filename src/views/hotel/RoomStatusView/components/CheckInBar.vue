<template>
  <div class="room-status-check-in-bar">
    <div class="room-status-check-in-search-row">
      <el-input v-model="contact" placeholder="联系方式" clearable />
      <el-button type="primary" @click="emit('search')">查询</el-button>
      <el-button v-if="searched" @click="emit('clear')">返回房态</el-button>
    </div>
    <div v-if="searched" class="room-status-check-in-detail">
      <template v-if="todayBookingList.length > 0">
        <el-select v-if="todayBookingList.length > 1" v-model="selectedOrderId" class="room-status-check-in-order" placeholder="选择今天的预定">
          <el-option
            v-for="orderRow in todayBookingList"
            :key="orderRow.bookingOrderId"
            :label="bookedOrderLabel(orderRow)"
            :value="orderRow.bookingOrderId"
          />
        </el-select>
        <div v-if="isEmpty(selectedTodayOrder) !== true" class="room-status-check-in-result">
          <span>预定人 <strong>{{ selectedTodayOrder.guestName }}</strong></span>
          <span>联系方式 <strong>{{ selectedTodayOrder.contact }}</strong></span>
          <span>
            入住
            <strong>{{ formatLocalDateTime(selectedTodayOrder.checkInDate) }} 至 {{ formatLocalDateTime(selectedTodayOrder.checkOutDate) }}</strong>
          </span>
          <span>房型 <strong>{{ selectedTodayOrder.typeName }}</strong></span>
          <el-button class="room-status-check-in-action" type="primary" :disabled="isEmpty(selectedRoomId)" @click="emit('confirm')">
            办理入住
          </el-button>
        </div>
      </template>
      <div v-else class="room-status-check-in-result">
        <span>没有今天的预定</span>
        <span>入住时间 <strong>{{ walkInCheckInDateText }}</strong></span>
        <span class="room-status-check-in-hint">早上 {{ HotelBusinessDay.START_HOUR }} 点前仍算前一天</span>
        <el-radio-group v-model="walkInNightChoice" class="room-status-night-choice">
          <el-radio-button v-for="nightCount in HotelWalkInNight.PRESET_COUNT_LIST" :key="nightCount" :value="nightCount">{{ nightCount }} 晚</el-radio-button>
          <el-radio-button :value="HotelWalkInNight.CUSTOM">自定义</el-radio-button>
        </el-radio-group>
        <el-input
          v-if="walkInNightChoice === HotelWalkInNight.CUSTOM"
          v-model="walkInCustomNightCount"
          class="room-status-walk-in-nights"
          placeholder="入住晚数"
          clearable
        />
        <el-button class="room-status-check-in-action" type="primary" :disabled="isEmpty(selectedRoomId)" @click="emit('confirm')">
          办理入住
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HotelBusinessDay, HotelWalkInNight } from '../../../../utils/constants';
import { formatLocalDateTime, isEmpty } from '../../../../utils/tools';

export interface CheckInBarOrder {
  bookingOrderId: string;
  guestName: string;
  contact: string;
  typeName: string;
  checkInDate: string;
  checkOutDate: string;
  username?: string;
}

const contact = defineModel<string>('contact', { required: true });
const selectedOrderId = defineModel<string>('selectedOrderId', { required: true });
const walkInNightChoice = defineModel<number | string>('walkInNightChoice', { required: true });
const walkInCustomNightCount = defineModel<string>('walkInCustomNightCount', { required: true });

defineProps<{
  searched: boolean;
  todayBookingList: CheckInBarOrder[];
  selectedTodayOrder: CheckInBarOrder | null;
  selectedRoomId: string;
  walkInCheckInDateText: string;
}>();

const emit = defineEmits<{
  search: [];
  clear: [];
  confirm: [];
}>();

/**
 * 今天的预定在下拉里的文字。
 */
function bookedOrderLabel(orderRow: CheckInBarOrder): string {
  const guestName = isEmpty(orderRow.guestName) !== true
    ? orderRow.guestName
    : isEmpty(orderRow.username) !== true
      ? String(orderRow.username)
      : isEmpty(orderRow.contact)
        ? ''
        : orderRow.contact;
  return `${guestName} ${formatLocalDateTime(orderRow.checkInDate)} 至 ${formatLocalDateTime(orderRow.checkOutDate)}`;
}
</script>

<style scoped>
.room-status-check-in-bar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid #e6e8ec;
  border-radius: 12px;
  background: #fff;
}

.room-status-check-in-detail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.room-status-check-in-search-row {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.room-status-check-in-search-row :deep(.el-input) {
  width: 220px;
}

.room-status-check-in-order {
  width: 280px;
}

.room-status-check-in-result {
  display: flex;
  flex: 0 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  min-width: 0;
  color: #667085;
  font-size: 13px;
  line-height: 20px;
}

.room-status-check-in-result strong {
  color: #1c2434;
  font-weight: 600;
}

.room-status-check-in-hint {
  color: #98a2b3;
}

.room-status-check-in-action {
  margin-left: 0;
  flex: 0 0 auto;
}

.room-status-night-choice {
  display: flex;
  flex-wrap: wrap;
  width: auto;
  margin-top: 0;
}

.room-status-night-choice :deep(.el-radio-button__inner) {
  padding-left: 10px;
  padding-right: 10px;
}

.room-status-walk-in-nights {
  width: 120px;
}
</style>
