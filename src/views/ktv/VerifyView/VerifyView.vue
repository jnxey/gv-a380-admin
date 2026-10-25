<template>
  <ShopSwitcher />
  <el-card>
    <QueryBar @search="searchOrders" @reset="resetQuery">
      <el-form-item>
        <el-input v-model="verifyCode" v-place class="query-keyword" placeholder="核销码" clearable />
      </el-form-item>
    </QueryBar>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(orderList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="orderRow in orderList" :key="orderRow.bookingOrderId">
        <RecordField label="订单号">{{ orderRow.orderNo }}</RecordField>
        <RecordField label="账号">{{ orderRow.username }}</RecordField>
        <RecordField label="类型">{{ orderRow.roomTypeName }}</RecordField>
        <RecordField label="包厢">{{ orderRow.roomName }}</RecordField>
        <RecordField label="日期">{{ formatLocalDateTime(orderRow.bookingDate) }}</RecordField>
        <RecordField label="开始">{{ formatLocalDateTime(orderRow.startTime) }}</RecordField>
        <RecordField label="小时">{{ orderRow.durationHours }}</RecordField>
        <RecordField label="结束">{{ formatBookingEnd(orderRow) }}</RecordField>
        <RecordField label="包厢费">{{ orderRow.amount }}</RecordField>
        <RecordField label="核销码">{{ VerifyCodeMask }}</RecordField>
        <RecordField label="状态">{{ statusLabel(orderRow.orderStatus) }}</RecordField>
        <template #actions>
          <el-button v-if="canVerify && orderRow.orderStatus === KtvOrderStatus.PENDING_VERIFY" link type="primary" @click="openVerify(orderRow.bookingOrderId)">核销</el-button>
          <el-button
            v-if="canCancel && orderRow.orderStatus === KtvOrderStatus.PENDING_PAY"
            link
            type="danger"
            @click="cancelOrder(orderRow.bookingOrderId, false)"
          >
            取消
          </el-button>
          <el-button
            v-if="canCancel && orderRow.orderStatus === KtvOrderStatus.PENDING_VERIFY"
            link
            type="danger"
            @click="cancelOrder(orderRow.bookingOrderId, true)"
          >
            取消
          </el-button>
        </template>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="verifyVisible" title="分配包厢" width="420px">
      <div v-if="isEmpty(freeRoomList)" class="record-empty">该时段没有空闲包厢</div>
      <el-form v-else label-position="top">
        <el-form-item label="包厢">
          <el-select v-model="verifyRoomId">
            <el-option v-for="room in freeRoomList" :key="room.id" :label="room.roomName" :value="room.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="verifyVisible = false">取消</el-button>
        <el-button size="large" type="primary" :disabled="isEmpty(freeRoomList)" @click="submitVerify">确认核销</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { KtvApi } from '../../../api/ktv';
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { KtvOrderStatus, PageSetting, PermissionCode, VerifyCodeMask, statusLabel } from '../../../utils/constants';
import { isEmpty, formatLocalDateTime } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface FreeRoom {
  id: string;
  roomName: string;
}

interface OrderRow {
  bookingOrderId: string;
  orderNo: string;
  username: string;
  roomTypeName: string;
  roomName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  amount: string;
  verifyCode: string;
  orderStatus: string;
}

const sessionStore = useSessionStore();
const canVerify = sessionStore.hasPermission(PermissionCode.KTV_ORDER_VERIFY);
const canCancel = sessionStore.hasPermission(PermissionCode.KTV_ORDER_CANCEL);
const verifyCode = ref('');
const orderList = ref<OrderRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);
const verifyVisible = ref(false);
const verifyOrderId = ref('');
const verifyRoomId = ref('');
const freeRoomList = ref<FreeRoom[]>([]);

/**
 * 结束钟点不晚于开唱钟点时，表示已经跨到第二天。
 */
function formatBookingEnd(orderRow: OrderRow): string {
  const endTimeText = formatLocalDateTime(orderRow.endTime);
  if (orderRow.endTime <= orderRow.startTime) {
    return `次日 ${endTimeText}`;
  }
  return endTimeText;
}

/**
 * 查询当前门店预订订单。
 */
async function loadOrders(): Promise<void> {
  const pageResult = (await http.get(KtvApi.BOOKING_ORDERS, {
    params: { verifyCode: verifyCode.value, page: page.value, pageSize: pageSize.value },
  })) as { list: OrderRow[]; total: number };
  orderList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 打开核销弹窗，并加载该时段还能分配的包厢。
 */
async function openVerify(bookingOrderId: string): Promise<void> {
  verifyOrderId.value = bookingOrderId;
  verifyRoomId.value = '';
  freeRoomList.value = (await http.get(KtvApi.bookingOrderFreeRooms(bookingOrderId))) as FreeRoom[];
  if (isEmpty(freeRoomList.value) !== true) {
    verifyRoomId.value = freeRoomList.value[0].id;
  }
  verifyVisible.value = true;
}

/**
 * 把选中的空闲包厢写入订单并核销。
 */
async function submitVerify(): Promise<void> {
  if (isEmpty(verifyRoomId.value)) {
    ElMessage.warning('该时段没有空闲包厢');
    return;
  }
  await http.post(KtvApi.bookingOrderVerify(verifyOrderId.value), {
    roomId: verifyRoomId.value,
  });
  ElMessage.success('核销成功');
  verifyVisible.value = false;
  await loadOrders();
}

/**
 * 取消订单。已支付的待核销会退回包厢费；待支付只关单。
 */
async function cancelOrder(bookingOrderId: string, needRefund: boolean): Promise<void> {
  await ElMessageBox.confirm(needRefund ? '确认取消并退款？' : '确认取消该待支付订单？', '取消订单');
  await http.post(KtvApi.bookingOrderCancel(bookingOrderId));
  ElMessage.success(needRefund ? '已退款' : '已取消');
  await loadOrders();
}

/**
 * 从第一页重新查询。
 */
function searchOrders(): void {
  page.value = PageSetting.DEFAULT_PAGE;
  void loadOrders();
}

/**
 * 清空核销码并回到第一页。
 */
function resetQuery(): void {
  verifyCode.value = '';
  page.value = PageSetting.DEFAULT_PAGE;
  void loadOrders();
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadOrders();
}

onMounted(() => {
  void loadOrders();
});
</script>

<style scoped>
@media (min-width: 1200px) {
  .record-list--wide-table :deep(.record-actions) {
    width: 188px;
    white-space: nowrap;
  }
}
</style>

