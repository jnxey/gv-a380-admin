<template>
  <section class="cashier-panel cashier-products">
    <div class="cashier-title">商品</div>
    <div class="cashier-search">
      <el-input
        :model-value="keyword"
        size="large"
        placeholder="商品名称/条码"
        clearable
        @update:model-value="updateKeyword"
        @keyup.enter="searchProducts"
      />
      <el-button
        type="warning"
        size="large"
        class="cashier-scan-button"
        aria-label="扫码"
        @click="toggleProductScanListen"
      >
        <AppIcon :icon-name="MenuIconName.SCAN_QR" />
        <span>{{ productScanLoopRunning ? '听枪中' : '扫码' }}</span>
      </el-button>
    </div>
    <div ref="productCardArea" class="product-card-area">
      <div v-if="isEmpty(productList)" class="record-empty">暂无商品</div>
      <div v-else class="product-grid">
        <button
          v-for="productRow in productList"
          :key="productRow.productId"
          type="button"
          class="product-card"
          :disabled="productRow.stockQuantity < 1 || productRow.status !== RecordStatus.ENABLED"
          @click="emit('add', productRow)"
        >
          <div class="product-card-body">
            <div class="product-name">{{ productRow.productName }}</div>
            <div class="product-price">{{ productRow.salePrice }}</div>
          </div>
          <div class="product-meta">
            <template v-if="productRow.stockQuantity < 1 || productRow.status !== RecordStatus.ENABLED">售罄</template>
            <template v-else>库存 {{ productRow.stockQuantity }}</template>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import AppIcon from '../../../../components/AppIcon/AppIcon.vue';
import { cancelScanGun } from '../../../../components/ScanGunPrompt/scan-gun';
import { readScanText } from '../../../../components/ScanGunPrompt/read-scan-text';
import { MenuIconName, PayRechargeQrText, RecordStatus, StoreProductBarcode } from '../../../../utils/constants';
import { readScanCode } from '../../../../utils/gv-sdk';
import { isEmpty } from '../../../../utils/tools';

interface ProductRow {
  productId: string;
  productName: string;
  salePrice: string;
  stockQuantity: number;
  status: string;
}

const props = defineProps<{
  keyword: string;
  productList: ProductRow[];
  searchProducts: () => Promise<ProductRow[]>;
  findProductsByScan: (scanText: string) => Promise<ProductRow[]>;
  payByMemberScan: (cipherText: string) => Promise<void>;
}>();

const emit = defineEmits<{
  'update:keyword': [keyword: string];
  add: [productRow: ProductRow];
}>();

/**
 * 写入搜索词并刷新列表。有关键字时查全部商品，清空后回到快捷商品。
 */
function updateKeyword(keywordText: string): void {
  emit('update:keyword', keywordText);
  void props.searchProducts();
}

/**
 * 按当前关键字查询商品。
 */
function searchProducts(): void {
  void props.searchProducts();
}

const productCardArea = ref<HTMLElement | null>(null);
const productScanLoopRunning = ref(false);
let productScanLoopAlive = false;

/**
 * 停掉商品听枪循环，并收起当前扫码浮窗。
 */
function stopProductScanLoop(): void {
  productScanLoopAlive = false;
  cancelScanGun();
}

/**
 * 当前是否会走 GV_SDK 相机扫码（与 readScanText 一致：宿主注入了 scanCode）。
 */
function willUseGvSdkCamera(): boolean {
  return readScanCode() !== null;
}

/**
 * 超过商品条码上限且整段是 Base64 时，当成付款/充值二维码。短条码仍走商品搜索。
 */
function isPayRechargeQrText(scanText: string): boolean {
  if (scanText.length <= StoreProductBarcode.MAX_LENGTH) {
    return false;
  }
  return PayRechargeQrText.PATTERN.test(scanText);
}

/**
 * 扫码查商品；仅命中一件可卖时加入购物车。不改搜索框和当前列表。扫到付款码时按会员余额收款，并等这次收款结束。
 */
async function applyProductScan(scanText: string): Promise<void> {
  if (isPayRechargeQrText(scanText) === true) {
    await props.payByMemberScan(scanText);
    return;
  }
  const productRows = await props.findProductsByScan(scanText);
  if (productRows.length !== 1) {
    return;
  }
  const productRow = productRows[0];
  if (productRow.stockQuantity < 1 || productRow.status !== RecordStatus.ENABLED) {
    return;
  }
  emit('add', productRow);
}

/**
 * 听商品条码。扫码枪可连续听；GV_SDK 相机扫完一次即结束，不再重新拉起。
 */
async function startProductScanLoop(): Promise<void> {
  if (productScanLoopRunning.value === true) {
    return;
  }
  productScanLoopAlive = true;
  productScanLoopRunning.value = true;
  const useGvSdkCamera = willUseGvSdkCamera();
  try {
    while (productScanLoopAlive === true) {
      const scanText = await readScanText(productCardArea.value);
      if (productScanLoopAlive !== true) {
        break;
      }
      if (isEmpty(scanText)) {
        break;
      }
      await applyProductScan(scanText);
      // GV_SDK 扫一次即可，不要立刻再开相机。
      if (useGvSdkCamera === true) {
        break;
      }
    }
  } finally {
    productScanLoopRunning.value = false;
    productScanLoopAlive = false;
  }
}

/**
 * 点商品区扫码：未听则开始听枪，已听则停止。
 */
function toggleProductScanListen(): void {
  if (productScanLoopRunning.value === true) {
    stopProductScanLoop();
    return;
  }
  void startProductScanLoop();
}

/**
 * 商品听枪是否正在跑。提交订单前用这个决定成功或失败后要不要恢复。
 */
function isProductScanLoopRunning(): boolean {
  return productScanLoopRunning.value === true;
}

/**
 * 停掉商品听枪。返回刚才是否开着，调用方扫完后再决定恢复。
 */
function pauseProductScan(): boolean {
  const productScanListening = productScanLoopRunning.value === true || productScanLoopAlive === true;
  stopProductScanLoop();
  return productScanListening;
}

/**
 * 重新开始听商品条码。
 */
function resumeProductScan(): void {
  void startProductScanLoop();
}

defineExpose({
  isProductScanLoopRunning,
  pauseProductScan,
  resumeProductScan,
});

onBeforeUnmount(() => {
  stopProductScanLoop();
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

.product-card-area {
  position: relative;
  min-height: 120px;
}

.cashier-search {
  display: flex;
  align-items: stretch;
  gap: 10px;
  width: 100%;
  margin-bottom: 14px;
}

.cashier-search :deep(.el-input),
.cashier-search .cashier-scan-button {
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

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
  gap: 12px;
}

.product-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  min-height: 112px;
  padding: 16px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.product-card:hover:not(:disabled) {
  border-color: #98a2b3;
  box-shadow: 0 4px 12px rgba(16, 24, 40, 0.08);
}

.product-card:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.product-card-body {
  min-width: 0;
}

.product-name {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  color: #1c2434;
  word-break: break-word;
}

.product-price {
  margin-top: 10px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  color: #1c2434;
  text-align: right;
}

.product-meta {
  color: #667085;
  font-size: 12px;
  line-height: 1.3;
}

.record-empty {
  padding: 36px 12px;
  text-align: center;
  color: #98a2b3;
  font-size: 13px;
}
</style>
