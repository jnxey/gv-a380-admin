<template>
  <el-card>
    <el-form inline @submit.prevent="loadOrders">
      <el-form-item label="核销码">
        <el-input v-model="verifyCode" clearable />
      </el-form-item>
      <el-button type="primary" @click="loadOrders">查询</el-button>
    </el-form>
    <el-table :data="orderList" border>
      <el-table-column prop="orderNo" label="订单号" min-width="180" />
      <el-table-column prop="memberName" label="会员" />
      <el-table-column prop="mobile" label="手机号" />
      <el-table-column prop="roomName" label="包厢" />
      <el-table-column prop="bookingDate" label="日期" />
      <el-table-column prop="startTime" label="开始" />
      <el-table-column prop="endTime" label="结束" />
      <el-table-column prop="amount" label="包厢费" />
      <el-table-column prop="verifyCode" label="核销码" />
      <el-table-column label="状态">
        <template #default="scope">{{ statusLabel(scope.row.orderStatus) }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="220">
        <template #default="scope">
          <el-button v-if="canVerify && scope.row.orderStatus === KtvOrderStatus.PENDING_VERIFY" link type="primary" @click="verifyOrder(scope.row.bookingOrderId)">核销</el-button>
          <el-button v-if="canConsume && scope.row.orderStatus === KtvOrderStatus.VERIFIED" link type="primary" @click="openConsume(scope.row.bookingOrderId)">店内消费</el-button>
          <el-button
            v-if="canCancel && (scope.row.orderStatus === KtvOrderStatus.PENDING_VERIFY || scope.row.orderStatus === KtvOrderStatus.VERIFIED)"
            link
            type="danger"
            @click="cancelOrder(scope.row.bookingOrderId)"
          >取消退款</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination class="pager" layout="total, prev, pager, next" :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="consumeVisible" title="店内消费" width="420px">
      <el-form label-width="80px">
        <el-form-item label="金额"><el-input v-model="consumeAmount" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="consumeRemark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="consumeVisible = false">取消</el-button>
        <el-button type="primary" @click="submitConsume">确认扣款</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { KtvOrderStatus, PageSetting, PermissionCode, statusLabel } from '../../utils/constants';
import { useSessionStore } from '../../stores/session';
import http from '../../utils/request';

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
.pager {
  margin-top: 16px;
}
</style>
