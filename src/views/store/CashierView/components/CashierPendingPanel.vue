<template>
  <section class="cashier-panel cashier-pending">
    <div class="cashier-title">待发货</div>
    <div v-if="isEmpty(pendingDeliveryList)" class="cart-empty">暂无待发货订单</div>
    <div v-else class="pending-list">
      <article v-for="saleRow in pendingDeliveryList" :key="saleRow.saleId" class="pending-card">
        <div class="pending-no">{{ saleRow.saleNo }}</div>
        <div v-for="itemRow in saleRow.itemList" :key="`${saleRow.saleId}-${itemRow.productId}`" class="pending-line">
          {{ itemRow.productName }} × {{ itemRow.quantity }}
        </div>
        <div v-if="isEmpty(saleRow.receiverName) !== true" class="pending-meta">收货人 {{ saleRow.receiverName }}</div>
        <div v-if="isEmpty(saleRow.contact) !== true" class="pending-meta">联系方式 {{ saleRow.contact }}</div>
        <div v-if="isEmpty(saleRow.deliveryAddress) !== true" class="pending-meta">收货地址 {{ saleRow.deliveryAddress }}</div>
        <div class="pending-amount">{{ saleRow.amount }}</div>
        <div class="pending-actions">
          <el-button type="primary" @click="openDeliveryDialog(saleRow)">送货</el-button>
          <el-button @click="cancelPendingSale(saleRow)">取消</el-button>
        </div>
      </article>
    </div>
  </section>
  <el-dialog v-model="deliveryDialogVisible" title="送货" width="480px">
    <el-form label-position="top">
      <el-form-item label="送货人">
        <el-input v-model="deliveryForm.courierName" :maxlength="StoreDeliveryField.COURIER_NAME_MAX_LENGTH" />
      </el-form-item>
      <el-form-item label="联系方式">
        <el-input v-model="deliveryForm.courierContact" :maxlength="StoreDeliveryField.COURIER_CONTACT_MAX_LENGTH" />
      </el-form-item>
      <el-form-item label="送货号">
        <div class="delivery-no-row">
          <el-input v-model="deliveryForm.deliveryNo" :maxlength="StoreDeliveryField.DELIVERY_NO_MAX_LENGTH" />
          <el-button
            type="warning"
            size="large"
            class="cashier-scan-button"
            aria-label="扫码"
            :disabled="deliverySubmitting"
            @click="scanDeliveryNo"
          >
            <AppIcon :icon-name="MenuIconName.SCAN_QR" />
            <span>扫码</span>
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="deliveryForm.deliveryRemark" :maxlength="StoreDeliveryField.REMARK_MAX_LENGTH" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="deliverySubmitting" @click="deliveryDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="deliverySubmitting" @click="submitDelivery">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { StoreApi } from '../../../../api/store';
import AppIcon from '../../../../components/AppIcon/AppIcon.vue';
import { readScanText } from '../../../../components/ScanGunPrompt/read-scan-text';
import { MenuIconName, StoreDeliveryField } from '../../../../utils/constants';
import { isEmpty } from '../../../../utils/tools';
import http from '../../../../utils/request';
import { useCashierPendingRefresh } from '../utils/cashier-pending-refresh';

interface PendingSaleItemRow {
  productId: string;
  productName: string;
  quantity: number;
}

interface PendingSaleRow {
  saleId: string;
  saleNo: string;
  amount: string;
  receiverName: string;
  contact: string;
  deliveryAddress: string;
  itemList: PendingSaleItemRow[];
}

const props = defineProps<{
  pauseProductScan: () => boolean;
  resumeProductScan: () => void;
}>();

const emit = defineEmits<{
  'stock-changed': [];
}>();

const pendingDeliveryList = ref<PendingSaleRow[]>([]);
const deliveryDialogVisible = ref(false);
const deliverySubmitting = ref(false);
const deliverySaleId = ref('');
const deliveryForm = reactive({
  courierName: '',
  courierContact: '',
  deliveryNo: '',
  deliveryRemark: '',
});

/**
 * 读取当前门店的待发货销售单。
 */
async function loadPendingDeliverySales(): Promise<void> {
  try {
    pendingDeliveryList.value = (await http.get(StoreApi.SALES_PENDING_DELIVERY)) as PendingSaleRow[];
  } catch {
    pendingDeliveryList.value = [];
  }
}

const { startPendingDeliveryRefresh, stopPendingDeliveryRefresh } = useCashierPendingRefresh({
  loadPendingDeliverySales,
});

/**
 * 扫一次送货号。先停商品听枪，取消或扫完后再按需要恢复。
 */
async function scanDeliveryNo(): Promise<void> {
  if (deliverySubmitting.value === true) {
    return;
  }
  const resumeProductListen = props.pauseProductScan();
  try {
    const scanText = await readScanText();
    if (isEmpty(scanText)) {
      return;
    }
    deliveryForm.deliveryNo = scanText.slice(0, StoreDeliveryField.DELIVERY_NO_MAX_LENGTH);
  } finally {
    if (resumeProductListen === true) {
      props.resumeProductScan();
    }
  }
}

/**
 * 打开送货表单，并清掉上一次填写的内容。
 */
function openDeliveryDialog(saleRow: PendingSaleRow): void {
  deliverySaleId.value = saleRow.saleId;
  deliveryForm.courierName = '';
  deliveryForm.courierContact = '';
  deliveryForm.deliveryNo = '';
  deliveryForm.deliveryRemark = '';
  deliveryDialogVisible.value = true;
}

/**
 * 校验送货信息后把订单改为送货中。
 */
async function submitDelivery(): Promise<void> {
  if (deliverySubmitting.value || isEmpty(deliverySaleId.value)) {
    return;
  }
  const courierName = deliveryForm.courierName.trim();
  const courierContact = deliveryForm.courierContact.trim();
  const deliveryNo = deliveryForm.deliveryNo.trim();
  const deliveryRemark = deliveryForm.deliveryRemark.trim();
  if (isEmpty(courierName)) {
    ElMessage.warning('请填写送货人');
    return;
  }
  if (isEmpty(courierContact)) {
    ElMessage.warning('请填写联系方式');
    return;
  }
  if (courierName.length > StoreDeliveryField.COURIER_NAME_MAX_LENGTH || courierContact.length > StoreDeliveryField.COURIER_CONTACT_MAX_LENGTH) {
    ElMessage.warning('送货人或联系方式过长');
    return;
  }
  if (deliveryNo.length > StoreDeliveryField.DELIVERY_NO_MAX_LENGTH) {
    ElMessage.warning('送货号过长');
    return;
  }
  if (deliveryRemark.length > StoreDeliveryField.REMARK_MAX_LENGTH) {
    ElMessage.warning('送货备注过长');
    return;
  }
  deliverySubmitting.value = true;
  try {
    await http.post(StoreApi.saleDeliver(deliverySaleId.value), {
      courierName,
      courierContact,
      deliveryNo,
      deliveryRemark,
    });
    deliveryDialogVisible.value = false;
    ElMessage.success('已开始送货');
    await loadPendingDeliverySales();
  } catch {
    return;
  } finally {
    deliverySubmitting.value = false;
  }
}

/**
 * 取消待发货订单。确认后库存加回，会员余额退回。
 */
async function cancelPendingSale(saleRow: PendingSaleRow): Promise<void> {
  try {
    await ElMessageBox.confirm('确认取消该待发货订单？已支付将退回余额。', '取消订单');
  } catch {
    return;
  }
  try {
    await http.post(StoreApi.saleCancel(saleRow.saleId));
  } catch {
    return;
  }
  ElMessage.success('已取消');
  await loadPendingDeliverySales();
  emit('stock-changed');
}

onMounted(() => {
  void loadPendingDeliverySales();
  startPendingDeliveryRefresh();
});

onBeforeUnmount(() => {
  stopPendingDeliveryRefresh();
});
</script>

<style scoped>
.cashier-panel {
  padding: 16px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #f9fafb;
}

.cashier-title {
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1c2434;
}

.cart-empty {
  padding: 36px 12px;
  text-align: center;
  color: #98a2b3;
  font-size: 13px;
}

.delivery-no-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
  width: 100%;
}

.delivery-no-row :deep(.el-input),
.delivery-no-row .cashier-scan-button {
  flex: 1 1 0;
  min-width: 0;
  width: 100%;
}

.cashier-scan-button {
  height: 40px;
  margin: 0;
  border-radius: 8px;
  font-weight: 600;
}

.cashier-scan-button svg {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  vertical-align: -3px;
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 220px);
  overflow: auto;
}

.pending-card {
  padding: 12px;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #fff;
}

.pending-no {
  font-weight: 600;
  color: #1c2434;
}

.pending-line,
.pending-meta {
  margin-top: 6px;
  color: #667085;
  font-size: 13px;
}

.pending-amount {
  margin-top: 8px;
  color: #1f8a70;
  font-size: 18px;
  font-weight: 700;
}

.pending-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
</style>
