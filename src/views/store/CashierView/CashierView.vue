<template>
  <ShopSwitcher />
  <el-card>
    <div class="cashier-layout">
      <CashierProductPanel
        ref="productPanelRef"
        v-model:keyword="keyword"
        :product-list="productList"
        :search-products="loadProducts"
        :pay-by-member-scan="onPayQrScanned"
        @add="addCartLine"
      />
      <CashierCartPanel
        :cart-line-list="cartLineList"
        :cart-amount-text="cartAmountText"
        :can-cash="canCash"
        :checkout-disabled="checkoutDisabled"
        :submitting="submitting"
        @remove="removeCartLine"
        @change-quantity="changeCartLineQuantity"
        @cash="submitCashSale"
      />
      <CashierPendingPanel
        :pause-product-scan="pauseProductScan"
        :resume-product-scan="resumeProductScan"
        @stock-changed="loadProducts"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { StoreApi } from '../../../api/store';
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { FinanceBizType, PageSetting, PermissionCode, statusLabel, StorePayMethod } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import CashierCartPanel from './components/CashierCartPanel.vue';
import CashierPendingPanel from './components/CashierPendingPanel.vue';
import CashierProductPanel from './components/CashierProductPanel.vue';

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

interface CashierProductPanelExpose {
  isProductScanLoopRunning: () => boolean;
  pauseProductScan: () => boolean;
  resumeProductScan: () => void;
}

const sessionStore = useSessionStore();
const canCash = sessionStore.hasPermission(PermissionCode.STORE_SALE_CASH);
const canMember = sessionStore.hasPermission(PermissionCode.STORE_SALE_MEMBER);
const keyword = ref('');
const productList = ref<ProductRow[]>([]);
const cartLineList = ref<CartLine[]>([]);
const submitting = ref(false);
const productPanelRef = ref<CashierProductPanelExpose | null>(null);

/** 会员扫码收款播报，和用户扫码付款同一句。 */
const MemberPaySpeech = {
  LANGUAGE: 'zh-CN',
  PREFIX: '收款',
  SUFFIX: '元',
};

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
 * 购物车为空或正在提交时，现金收款不能点。
 */
const checkoutDisabled = computed(() => {
  return isEmpty(cartLineList.value) || submitting.value;
});

/**
 * 取出商品面板。还没挂上时返回空。
 */
function readProductPanel(): CashierProductPanelExpose | null {
  if (isEmpty(productPanelRef.value)) {
    return null;
  }
  return productPanelRef.value;
}

/**
 * 停掉商品听枪。返回刚才是否开着。
 */
function pauseProductScan(): boolean {
  const productPanel = readProductPanel();
  if (isEmpty(productPanel)) {
    return false;
  }
  return productPanel.pauseProductScan();
}

/**
 * 重新开始听商品条码。
 */
function resumeProductScan(): void {
  const productPanel = readProductPanel();
  if (isEmpty(productPanel)) {
    return;
  }
  productPanel.resumeProductScan();
}

/**
 * 查询可卖商品。
 */
async function loadProducts(): Promise<ProductRow[]> {
  const pageResult = (await http.get(StoreApi.PRODUCTS, {
    params: {
      keyword: keyword.value,
      page: PageSetting.DEFAULT_PAGE,
      pageSize: 100,
    },
  })) as { list: ProductRow[] };
  productList.value = pageResult.list;
  return pageResult.list;
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
 * 修改购物车里一件商品的数量。
 */
function changeCartLineQuantity(productId: string, quantity: number): void {
  const matchedCartLine = cartLineList.value.find((cartLine) => cartLine.productId === productId);
  if (isEmpty(matchedCartLine)) {
    return;
  }
  matchedCartLine.quantity = quantity;
}

/**
 * 从购物车删掉一件商品。
 */
function removeCartLine(productId: string): void {
  cartLineList.value = cartLineList.value.filter((cartLine) => cartLine.productId !== productId);
}

/**
 * 选出中文语音。还没有中文语音时返回空，交给浏览器默认语音。
 */
function findChineseVoice(): SpeechSynthesisVoice | null {
  if (isEmpty(window.speechSynthesis)) {
    return null;
  }
  const voiceList = window.speechSynthesis.getVoices();
  for (const voice of voiceList) {
    if (voice.lang === MemberPaySpeech.LANGUAGE || voice.lang.startsWith('zh')) {
      return voice;
    }
  }
  return null;
}

/**
 * 播报会员收款金额。和用户扫码付款同一句。
 */
function playMemberPaySound(amountText: string): void {
  if (isEmpty(amountText) || isEmpty(window.speechSynthesis)) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(`${MemberPaySpeech.PREFIX}${amountText}${MemberPaySpeech.SUFFIX}`);
  utterance.lang = MemberPaySpeech.LANGUAGE;
  const chineseVoice = findChineseVoice();
  if (chineseVoice !== null) {
    utterance.voice = chineseVoice;
  }
  window.speechSynthesis.speak(utterance);
}

/**
 * 现金收款成功后清空购物车并重新听商品码。
 */
async function afterCashSaleSucceeded(): Promise<void> {
  ElMessage.success('收款成功');
  cartLineList.value = [];
  await loadProducts();
  resumeProductScan();
}

/**
 * 会员扫码收款成功后播报金额、清空购物车并刷新商品。听枪还停在这次收款上，不用重新拉起。
 */
async function afterMemberSaleSucceeded(amountText: string): Promise<void> {
  playMemberPaySound(amountText);
  ElNotification({
    title: statusLabel(FinanceBizType.STORE_SALE),
    message: amountText,
    type: 'success',
  });
  cartLineList.value = [];
  await loadProducts();
}

/**
 * 现金收款。成功后清空购物车，并自动进入听枪。
 */
async function submitCashSale(): Promise<void> {
  if (checkoutDisabled.value || canCash !== true) {
    return;
  }
  submitting.value = true;
  const productPanel = readProductPanel();
  let wasListening = false;
  if (isEmpty(productPanel) !== true) {
    wasListening = productPanel.isProductScanLoopRunning() === true;
  }
  pauseProductScan();
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
    await afterCashSaleSucceeded();
  } catch {
    if (wasListening === true) {
      resumeProductScan();
    }
  } finally {
    submitting.value = false;
  }
}

/**
 * 听枪扫到付款码后按会员余额提交销售单。购物车为空或没有权限时只提示，不把密文拿去搜商品。
 */
async function onPayQrScanned(cipherText: string): Promise<void> {
  if (isEmpty(cartLineList.value)) {
    ElMessage.warning('请先加入商品');
    return;
  }
  if (canMember !== true) {
    ElMessage.warning('没有会员收款权限');
    return;
  }
  if (submitting.value === true) {
    return;
  }
  const amountText = cartAmountText.value;
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
    await afterMemberSaleSucceeded(amountText);
  } catch {
    // 接口已提示失败原因，听枪继续等下一次。
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void loadProducts();
});
</script>

<style scoped>
.cashier-layout {
  display: grid;
  grid-template-columns: 1.45fr 1fr 1fr;
  gap: 16px;
  align-items: start;
}

@media (max-width: 900px) {
  .cashier-layout {
    grid-template-columns: 1fr;
  }
}
</style>
