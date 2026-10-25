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
      <div v-if="isEmpty(recentCourierList) !== true" class="recent-courier-list">
        <button
          v-for="recentCourier in recentCourierList"
          :key="`${recentCourier.courierName}-${recentCourier.courierContact}`"
          type="button"
          class="recent-courier-button"
          :disabled="deliverySubmitting"
          @click="applyRecentCourier(recentCourier)"
        >
          {{ recentCourier.courierName }} {{ recentCourier.courierContact }}
        </button>
      </div>
      <el-form-item label="送货人">
        <el-input
          v-model="deliveryForm.courierName"
          :maxlength="StoreDeliveryField.COURIER_NAME_MAX_LENGTH"
          :placeholder="courierFieldPlaceholder"
        />
      </el-form-item>
      <el-form-item label="联系方式">
        <el-input
          v-model="deliveryForm.courierContact"
          :maxlength="StoreDeliveryField.COURIER_CONTACT_MAX_LENGTH"
          :placeholder="courierFieldPlaceholder"
        />
      </el-form-item>
      <el-form-item label="送货号">
        <div class="delivery-no-row">
          <el-input
            v-model="deliveryForm.deliveryNo"
            :maxlength="StoreDeliveryField.DELIVERY_NO_MAX_LENGTH"
            :placeholder="DeliveryFieldPlaceholder.OPTIONAL"
          />
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
        <el-input
          v-model="deliveryForm.deliveryRemark"
          :maxlength="StoreDeliveryField.REMARK_MAX_LENGTH"
          :placeholder="DeliveryFieldPlaceholder.OPTIONAL"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="deliverySubmitting" @click="deliveryDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="deliverySubmitting" @click="submitDelivery">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus';
import { StoreApi } from '../../../../api/store';
import AppIcon from '../../../../components/AppIcon/AppIcon.vue';
import { readScanText } from '../../../../components/ScanGunPrompt/read-scan-text';
import { MenuIconName, statusLabel, StorageKey, StoreDeliveryField, StoreSaleStatus } from '../../../../utils/constants';
import { isEmpty } from '../../../../utils/tools';
import http from '../../../../utils/request';
import { useSessionStore } from '../../../../stores/session';
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

interface RecentCourier {
  courierName: string;
  courierContact: string;
}

const RecentCourierCache = {
  MAX_COUNT: 5,
};

const DeliveryFieldPlaceholder = {
  REQUIRED: '必填',
  OPTIONAL: '非必填',
};

const PendingDeliverySpeech = {
  LANGUAGE: 'zh-CN',
  SINGLE: '有新的待发货订单',
  COUNT_PREFIX: '有',
  COUNT_SUFFIX: '笔新的待发货订单',
};

const props = defineProps<{
  pauseProductScan: () => boolean;
  resumeProductScan: () => void;
  loadPaymentNotices: () => Promise<void>;
}>();

const emit = defineEmits<{
  'stock-changed': [];
}>();

const sessionStore = useSessionStore();
const pendingDeliveryList = ref<PendingSaleRow[]>([]);
const recentCourierList = ref<RecentCourier[]>([]);
const deliveryDialogVisible = ref(false);
const deliverySubmitting = ref(false);
const deliverySaleId = ref('');
const deliveryForm = reactive({
  courierName: '',
  courierContact: '',
  deliveryNo: '',
  deliveryRemark: '',
});
let pendingDeliveryBaselineReady = false;
let pendingDeliverySpeechUnlocked = false;
let knownPendingSaleIdSet = new Set<string>();

/**
 * 选出中文语音。还没有中文语音时返回空，交给浏览器默认语音。
 */
function findChineseVoice(): SpeechSynthesisVoice | null {
  if (isEmpty(window.speechSynthesis)) {
    return null;
  }
  const voiceList = window.speechSynthesis.getVoices();
  for (const voice of voiceList) {
    if (voice.lang === PendingDeliverySpeech.LANGUAGE || voice.lang.startsWith('zh')) {
      return voice;
    }
  }
  return null;
}

/**
 * 第一次点击页面时解锁语音。浏览器要有过操作才允许出声。
 */
function preparePendingDeliveryAudio(): void {
  if (pendingDeliverySpeechUnlocked === true || isEmpty(window.speechSynthesis)) {
    return;
  }
  pendingDeliverySpeechUnlocked = true;
  window.speechSynthesis.getVoices();
  const unlockUtterance = new SpeechSynthesisUtterance('');
  unlockUtterance.volume = 0;
  window.speechSynthesis.speak(unlockUtterance);
}

/**
 * 新到的待发货订单出声，并弹出同样的文案。多笔合成一句。
 */
function playPendingDeliverySound(freshOrderCount: number): void {
  if (freshOrderCount < 1) {
    return;
  }
  const speechText = freshOrderCount === 1
    ? PendingDeliverySpeech.SINGLE
    : `${PendingDeliverySpeech.COUNT_PREFIX}${freshOrderCount}${PendingDeliverySpeech.COUNT_SUFFIX}`;
  ElNotification({
    title: statusLabel(StoreSaleStatus.PENDING_DELIVERY),
    message: speechText,
    type: 'success',
  });
  if (isEmpty(window.speechSynthesis)) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(speechText);
  utterance.lang = PendingDeliverySpeech.LANGUAGE;
  const chineseVoice = findChineseVoice();
  if (isEmpty(chineseVoice) !== true) {
    utterance.voice = chineseVoice;
  }
  window.speechSynthesis.speak(utterance);
}

/**
 * 停掉还没播完的待发货提醒。离开收银台时调用。
 */
function stopPendingDeliveryAudio(): void {
  if (isEmpty(window.speechSynthesis)) {
    return;
  }
  window.speechSynthesis.cancel();
}

/**
 * 读出销售单主键。没有主键的行不参与新旧比较。
 */
function readPendingSaleId(saleRow: PendingSaleRow): string {
  if (isEmpty(saleRow) || isEmpty(saleRow.saleId)) {
    return '';
  }
  return saleRow.saleId;
}

/**
 * 读取当前门店的待发货销售单。第一次只记住已有订单，之后出现新单再出声并弹出通知。
 */
async function loadPendingDeliverySales(): Promise<void> {
  let nextPendingDeliveryList: PendingSaleRow[] = [];
  try {
    nextPendingDeliveryList = (await http.get(StoreApi.SALES_PENDING_DELIVERY)) as PendingSaleRow[];
  } catch {
    pendingDeliveryList.value = [];
    return;
  }
  if (Array.isArray(nextPendingDeliveryList) !== true) {
    pendingDeliveryList.value = [];
    return;
  }
  pendingDeliveryList.value = nextPendingDeliveryList;
  const nextSaleIdSet = new Set<string>();
  const freshSaleIdList: string[] = [];
  for (const saleRow of nextPendingDeliveryList) {
    const saleId = readPendingSaleId(saleRow);
    if (isEmpty(saleId)) {
      continue;
    }
    nextSaleIdSet.add(saleId);
    if (pendingDeliveryBaselineReady === true && knownPendingSaleIdSet.has(saleId) !== true) {
      freshSaleIdList.push(saleId);
    }
  }
  knownPendingSaleIdSet = nextSaleIdSet;
  if (pendingDeliveryBaselineReady !== true) {
    pendingDeliveryBaselineReady = true;
    return;
  }
  playPendingDeliverySound(freshSaleIdList.length);
}

const { startPendingDeliveryRefresh, stopPendingDeliveryRefresh } = useCashierPendingRefresh({
  loadPendingDeliverySales,
  loadPaymentNotices: () => props.loadPaymentNotices(),
});

/**
 * 当前门店没标必带房间号时，送货人和联系方式必填。
 */
const deliveryInfoRequired = computed(() => {
  const currentShop = sessionStore.shopList.find((shop) => shop.shopId === sessionStore.currentShopId);
  if (isEmpty(currentShop) || currentShop.requireRoomNo !== true) {
    return true;
  }
  return false;
});

/**
 * 送货人和联系方式的占位文案。
 */
const courierFieldPlaceholder = computed(() => {
  if (deliveryInfoRequired.value === true) {
    return DeliveryFieldPlaceholder.REQUIRED;
  }
  return DeliveryFieldPlaceholder.OPTIONAL;
});

/**
 * 当前门店最近送货人的本地缓存键。
 */
function recentCourierStorageKey(shopId: string): string {
  return `${StorageKey.CASHIER_RECENT_COURIERS}_${shopId}`;
}

/**
 * 读出当前门店最近用过的送货人。坏数据当成没有。
 */
function readRecentCourierList(): RecentCourier[] {
  if (isEmpty(sessionStore.currentShopId)) {
    return [];
  }
  const storageText = window.localStorage.getItem(recentCourierStorageKey(sessionStore.currentShopId));
  if (isEmpty(storageText)) {
    return [];
  }
  let parsedCourierList: unknown;
  try {
    parsedCourierList = JSON.parse(storageText);
  } catch {
    return [];
  }
  if (Array.isArray(parsedCourierList) !== true) {
    return [];
  }
  const storedCourierList: RecentCourier[] = [];
  for (const courierRecord of parsedCourierList) {
    if (isEmpty(courierRecord) || Array.isArray(courierRecord) === true) {
      continue;
    }
    const courierName = (courierRecord as RecentCourier).courierName;
    const courierContact = (courierRecord as RecentCourier).courierContact;
    if (isEmpty(courierName) || isEmpty(courierContact)) {
      continue;
    }
    storedCourierList.push({
      courierName,
      courierContact,
    });
    if (storedCourierList.length >= RecentCourierCache.MAX_COUNT) {
      break;
    }
  }
  return storedCourierList;
}

/**
 * 送货成功后记住这一对送货人。相同的旧记录删掉，最新的放最前，最多 5 条。
 */
function rememberRecentCourier(courierName: string, courierContact: string): void {
  if (isEmpty(courierName) || isEmpty(courierContact) || isEmpty(sessionStore.currentShopId)) {
    return;
  }
  const keptCourierList = readRecentCourierList().filter((recentCourier) => {
    return recentCourier.courierName !== courierName || recentCourier.courierContact !== courierContact;
  });
  keptCourierList.unshift({
    courierName,
    courierContact,
  });
  const recentCourierListToSave = keptCourierList.slice(0, RecentCourierCache.MAX_COUNT);
  window.localStorage.setItem(
    recentCourierStorageKey(sessionStore.currentShopId),
    JSON.stringify(recentCourierListToSave),
  );
  recentCourierList.value = recentCourierListToSave;
}

/**
 * 点最近送货人时，同时填上姓名和联系方式。
 */
function applyRecentCourier(recentCourier: RecentCourier): void {
  if (deliverySubmitting.value === true) {
    return;
  }
  deliveryForm.courierName = recentCourier.courierName;
  deliveryForm.courierContact = recentCourier.courierContact;
}

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
  recentCourierList.value = readRecentCourierList();
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
  if (deliveryInfoRequired.value === true && isEmpty(courierName)) {
    ElMessage.warning('请填写送货人');
    return;
  }
  if (deliveryInfoRequired.value === true && isEmpty(courierContact)) {
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
    rememberRecentCourier(courierName, courierContact);
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
  window.addEventListener('pointerdown', preparePendingDeliveryAudio);
  void loadPendingDeliverySales();
  void props.loadPaymentNotices();
  startPendingDeliveryRefresh();
});

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', preparePendingDeliveryAudio);
  stopPendingDeliveryRefresh();
  stopPendingDeliveryAudio();
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

.recent-courier-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.recent-courier-button {
  margin: 0;
  padding: 6px 10px;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #fff;
  color: #1c2434;
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
}

.recent-courier-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
