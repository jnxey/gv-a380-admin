<template>
  <ShopSwitcher />
  <el-card>
    <div class="cashier-layout">
      <section class="cashier-panel cashier-products">
        <div class="cashier-title">商品</div>
        <div class="cashier-search">
          <el-input
            v-model="keyword"
            size="large"
            placeholder="商品名称/条码"
            clearable
            @keyup.enter="loadProducts"
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
              @click="addCartLine(productRow)"
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
      <section class="cashier-panel cashier-cart">
        <div class="cashier-title">购物车</div>
        <div v-if="isEmpty(cartLineList)" class="cart-empty">还没有商品，点左侧加入</div>
        <div v-else class="cart-list">
          <div v-for="cartLine in cartLineList" :key="cartLine.productId" class="cart-line">
            <div class="cart-line-main">
              <div class="cart-line-name">{{ cartLine.productName }}</div>
              <div class="cart-line-meta">
                <span>单价 {{ cartLine.salePrice }}</span>
                <span class="cart-line-dot">·</span>
                <span>小计 {{ (Number(cartLine.salePrice) * cartLine.quantity).toFixed(2) }}</span>
              </div>
            </div>
            <div class="cart-actions">
              <el-input-number v-model="cartLine.quantity" :min="1" :max="cartLine.stockQuantity" />
              <el-button
                class="cart-delete-button"
                link
                type="danger"
                aria-label="删除"
                @click="removeCartLine(cartLine.productId)"
              >
                <AppIcon :icon-name="MenuIconName.DELETE" />
              </el-button>
            </div>
          </div>
        </div>
        <div class="cart-total">
          <span class="cart-total-label">合计</span>
          <span class="cart-total-amount">{{ cartAmountText }}</span>
        </div>
        <div class="checkout-actions">
          <el-button
            v-if="canCash"
            type="primary"
            size="large"
            class="checkout-button"
            :disabled="checkoutDisabled"
            :loading="submitting"
            @click="submitCashSale"
          >
            收款 {{ cartAmountText }}
          </el-button>
          <div v-if="canMember" class="member-scan-wrap" @click.capture="pauseProductListenForMemberScan">
            <ScanButton
              type="warning"
              size="large"
              class="checkout-scan-button"
              aria-label="扫码收款"
              :disabled="checkoutDisabled"
              @scanned="onPayQrScanned"
            >
              <AppIcon :icon-name="MenuIconName.SCAN_QR" />
              <span>扫码收款 {{ cartAmountText }}</span>
            </ScanButton>
          </div>
        </div>
      </section>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { StoreApi } from '../../../api/store';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import { cancelScanGun } from '../../../components/ScanGunPrompt/scan-gun';
import { readScanText } from '../../../components/ScanGunPrompt/read-scan-text';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { MenuIconName, PageSetting, PermissionCode, RecordStatus, StorePayMethod } from '../../../utils/constants';
import { readScanCode } from '../../../utils/gv-sdk';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface ProductRow {
  productId: string;
  productName: string;
  salePrice: string;
  stockQuantity: number;
  status: string;
}

interface CartLine {
  productId: string;
  productName: string;
  salePrice: string;
  stockQuantity: number;
  quantity: number;
}

interface MemberRow {
  memberId: string;
  username: string;
  nickname: string;
  balance: string;
}

const sessionStore = useSessionStore();
const canCash = sessionStore.hasPermission(PermissionCode.STORE_SALE_CASH);
const canMember = sessionStore.hasPermission(PermissionCode.STORE_SALE_MEMBER);
const keyword = ref('');
const productList = ref<ProductRow[]>([]);
const cartLineList = ref<CartLine[]>([]);
const submitting = ref(false);
const productCardArea = ref<HTMLElement | null>(null);
const productScanLoopRunning = ref(false);
let productScanLoopAlive = false;
let resumeProductListenAfterMember = false;

/**
 * 购物车合计金额。
 */
const cartAmountText = computed(() => {
  let totalAmount = 0;
  for (const cartLine of cartLineList.value) {
    totalAmount += Number(cartLine.salePrice) * cartLine.quantity;
  }
  return totalAmount.toFixed(2);
});

/**
 * 购物车为空或正在提交时，收款和扫码收款都不能点。
 */
const checkoutDisabled = computed(() => {
  return isEmpty(cartLineList.value) || submitting.value;
});

/**
 * 停掉商品听枪循环，并收起当前扫码浮窗。
 */
function stopProductScanLoop(): void {
  productScanLoopAlive = false;
  cancelScanGun();
}

/**
 * 扫码查商品；仅命中一件可卖时加入购物车。
 */
async function applyProductScan(scanText: string): Promise<void> {
  keyword.value = scanText;
  await loadProducts();
  if (productList.value.length !== 1) {
    return;
  }
  const productRow = productList.value[0];
  if (productRow.stockQuantity < 1 || productRow.status !== RecordStatus.ENABLED) {
    return;
  }
  addCartLine(productRow);
}

/**
 * 当前是否会走 GV_SDK 相机扫码（与 readScanText 一致：宿主注入了 scanCode）。
 */
function willUseGvSdkCamera(): boolean {
  return readScanCode() !== null;
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
    while (productScanLoopAlive) {
      const scanText = await readScanText(productCardArea.value);
      if (!productScanLoopAlive) {
        break;
      }
      if (isEmpty(scanText)) {
        break;
      }
      await applyProductScan(scanText);
      // GV_SDK 扫一次即可，不要立刻再开相机。
      if (useGvSdkCamera) {
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
 * 查询可卖商品。
 */
async function loadProducts(): Promise<void> {
  const pageResult = (await http.get(StoreApi.PRODUCTS, {
    params: {
      keyword: keyword.value,
      page: PageSetting.DEFAULT_PAGE,
      pageSize: 100,
    },
  })) as { list: ProductRow[] };
  productList.value = pageResult.list;
}

/**
 * 把商品放进购物车。已有则数量加一。
 */
function addCartLine(productRow: ProductRow): void {
  const existedLine = cartLineList.value.find((cartLine) => cartLine.productId === productRow.productId);
  if (isEmpty(existedLine)) {
    cartLineList.value.push({
      productId: productRow.productId,
      productName: productRow.productName,
      salePrice: productRow.salePrice,
      stockQuantity: productRow.stockQuantity,
      quantity: 1,
    });
    return;
  }
  if (existedLine.quantity >= productRow.stockQuantity) {
    ElMessage.warning('库存不足');
    return;
  }
  existedLine.quantity += 1;
}

/**
 * 从购物车删掉一件商品。
 */
function removeCartLine(productId: string): void {
  cartLineList.value = cartLineList.value.filter((cartLine) => cartLine.productId !== productId);
}

/**
 * 扫会员付款码前先停商品听枪，并记住扫完是否恢复。
 */
function pauseProductListenForMemberScan(): void {
  resumeProductListenAfterMember = productScanLoopRunning.value === true || productScanLoopAlive === true;
  stopProductScanLoop();
}

/**
 * 收款成功后清空购物车并重新听商品码。
 */
async function afterSaleSucceeded(): Promise<void> {
  ElMessage.success('收款成功');
  cartLineList.value = [];
  await loadProducts();
  void startProductScanLoop();
}

/**
 * 现金收款。成功后清空购物车，并自动进入听枪。
 */
async function submitCashSale(): Promise<void> {
  if (checkoutDisabled.value || canCash !== true) {
    return;
  }
  submitting.value = true;
  const wasListening = productScanLoopRunning.value === true;
  stopProductScanLoop();
  try {
    await http.post(StoreApi.SALES, {
      payMethod: StorePayMethod.CASH,
      memberId: '',
      remark: '',
      itemList: cartLineList.value.map((cartLine) => ({
        productId: cartLine.productId,
        quantity: cartLine.quantity,
      })),
    });
    await afterSaleSucceeded();
  } catch {
    if (wasListening === true) {
      void startProductScanLoop();
    }
  } finally {
    submitting.value = false;
  }
}

/**
 * 扫付款码后立刻按会员余额提交销售单。失败或取消时按需要恢复商品听枪。
 */
async function onPayQrScanned(cipherText: string): Promise<void> {
  if (checkoutDisabled.value || canMember !== true) {
    if (resumeProductListenAfterMember === true) {
      resumeProductListenAfterMember = false;
      void startProductScanLoop();
    }
    return;
  }
  submitting.value = true;
  try {
    const memberRow = (await http.post(StoreApi.PAY_QR, { cipherText })) as MemberRow;
    await http.post(StoreApi.SALES, {
      payMethod: StorePayMethod.MEMBER,
      memberId: memberRow.memberId,
      remark: '',
      itemList: cartLineList.value.map((cartLine) => ({
        productId: cartLine.productId,
        quantity: cartLine.quantity,
      })),
    });
    resumeProductListenAfterMember = false;
    await afterSaleSucceeded();
  } catch {
    if (resumeProductListenAfterMember === true) {
      resumeProductListenAfterMember = false;
      void startProductScanLoop();
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void loadProducts();
});

onBeforeUnmount(() => {
  stopProductScanLoop();
});
</script>

<style scoped>
.cashier-layout {
  display: grid;
  grid-template-columns: 1.45fr 1fr;
  gap: 16px;
  align-items: start;
}

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

.cashier-scan-button,
.checkout-scan-button {
  height: 40px;
  margin: 0;
  border-radius: 8px;
  font-weight: 600;
}

.cashier-scan-button svg,
.checkout-scan-button svg {
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

.cart-empty,
.record-empty {
  padding: 36px 12px;
  text-align: center;
  color: #98a2b3;
  font-size: 13px;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  margin-bottom: 12px;
  overflow: auto;
}

.cart-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #fff;
}

.cart-line-main {
  min-width: 0;
  flex: 1 1 auto;
}

.cart-line-name {
  font-size: 14px;
  font-weight: 600;
  color: #1c2434;
  word-break: break-word;
}

.cart-line-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  color: #667085;
  font-size: 12px;
  line-height: 1.4;
}

.cart-line-dot {
  color: #d0d5dd;
}

.cart-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.cart-delete-button {
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
}

.cart-delete-button svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.cart-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 16px 18px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #fff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.cart-total-label {
  color: #667085;
  font-size: 13px;
}

.cart-total-amount {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #1c2434;
}

.checkout-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkout-button,
.member-scan-wrap,
.checkout-scan-button {
  width: 100%;
}

.checkout-button,
.checkout-scan-button {
  height: 48px;
  margin: 0;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .cashier-layout {
    grid-template-columns: 1fr;
  }
}
</style>
