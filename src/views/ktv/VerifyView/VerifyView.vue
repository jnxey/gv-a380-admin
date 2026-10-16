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
        <RecordField label="会员">{{ orderRow.memberName }}</RecordField>
        <RecordField label="手机号">{{ orderRow.mobile }}</RecordField>
        <RecordField label="包厢">{{ orderRow.roomName }}</RecordField>
        <RecordField label="日期">{{ orderRow.bookingDate }}</RecordField>
        <RecordField label="开始">{{ orderRow.startTime }}</RecordField>
        <RecordField label="结束">{{ orderRow.endTime }}</RecordField>
        <RecordField label="包厢费">{{ orderRow.amount }}</RecordField>
        <RecordField label="核销码">{{ orderRow.verifyCode }}</RecordField>
        <RecordField label="状态">{{ statusLabel(orderRow.orderStatus) }}</RecordField>
        <template #actions>
          <el-button v-if="canVerify && orderRow.orderStatus === KtvOrderStatus.PENDING_VERIFY" link type="primary" @click="verifyOrder(orderRow.bookingOrderId)">核销</el-button>
          <el-button v-if="canConsume && orderRow.orderStatus === KtvOrderStatus.VERIFIED" link type="primary" @click="openConsume(orderRow.bookingOrderId)">店内消费</el-button>
          <el-button
            v-if="canCancel && (orderRow.orderStatus === KtvOrderStatus.PENDING_VERIFY || orderRow.orderStatus === KtvOrderStatus.VERIFIED)"
            link
            type="danger"
            @click="cancelOrder(orderRow.bookingOrderId)"
          >取消退款</el-button>
        </template>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="consumeVisible" title="店内消费" width="420px">
      <el-form label-position="top">
        <el-form-item label="金额"><el-input v-model="consumeAmount" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="consumeRemark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="consumeVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="submitConsume">确认扣款</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { KtvOrderStatus, PageSetting, PermissionCode, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface OrderRow {
  bookingOrderId: string;
  orderNo: string;
  memberName: string;
  mobile: string;
  roomName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  amount: string;
  verifyCode: string;
  orderStatus: string;
}

const sessionStore = useSessionStore();
const canVerify = sessionStore.hasPermission(PermissionCode.KTV_ORDER_VERIFY);
const canConsume = sessionStore.hasPermission(PermissionCode.KTV_ORDER_CONSUME);
const canCancel = sessionStore.hasPermission(PermissionCode.KTV_ORDER_CANCEL);
const verifyCode = ref('');
const orderList = ref<OrderRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);
const consumeVisible = ref(false);
const consumeOrderId = ref('');
const consumeAmount = ref('');
const consumeRemark = ref('');

/**
 * 查询当前门店预订订单。
 */
async function loadOrders(): Promise<void> {
  const pageResult = (await http.get('/admin/ktv/booking-orders', {
    params: { verifyCode: verifyCode.value, page: page.value, pageSize: pageSize.value },
  })) as { list: OrderRow[]; total: number };
  orderList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 核销订单。
 */
async function verifyOrder(bookingOrderId: string): Promise<void> {
  await http.post(`/admin/ktv/booking-orders/${bookingOrderId}/verify`);
  ElMessage.success('核销成功');
  await loadOrders();
}

/**
 * 打开店内消费弹窗。
 */
function openConsume(bookingOrderId: string): void {
  consumeOrderId.value = bookingOrderId;
  consumeAmount.value = '';
  consumeRemark.value = '';
  consumeVisible.value = true;
}

/**
 * 提交店内消费扣款。
 */
async function submitConsume(): Promise<void> {
  await http.post(`/admin/ktv/booking-orders/${consumeOrderId.value}/consume`, {
    amount: consumeAmount.value,
    remark: consumeRemark.value,
  });
  ElMessage.success('消费已入账');
  consumeVisible.value = false;
  await loadOrders();
}

/**
 * 取消订单并退回包厢费。
 */
async function cancelOrder(bookingOrderId: string): Promise<void> {
  await ElMessageBox.confirm('确认取消并退款？', '取消订单');
  await http.post(`/admin/ktv/booking-orders/${bookingOrderId}/cancel`);
  ElMessage.success('已退款');
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

