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
          <ScanButton
            type="warning"
            size="large"
            class="cashier-scan-button"
            aria-label="扫码"
            @scanned="onProductKeywordScanned"
          >
            <AppIcon :icon-name="MenuIconName.SCAN_QR" />
            <span>扫码</span>
          </ScanButton>
        </div>
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
            <div class="product-name">{{ productRow.productName }}</div>
            <div class="product-price">{{ productRow.salePrice }}</div>
            <div class="product-meta">库存 {{ productRow.stockQuantity }}</div>
          </button>
        </div>
      </section>
      <section class="cashier-panel cashier-cart">
        <div class="cashier-title">购物车</div>
        <div v-if="isEmpty(cartLineList)" class="cart-empty">还没有商品，点左侧加入</div>
        <div v-else class="cart-list">
          <div v-for="cartLine in cartLineList" :key="cartLine.productId" class="cart-line">
            <div class="cart-line-main">
              <div class="product-name">{{ cartLine.productName }}</div>
              <div class="product-meta">{{ cartLine.salePrice }} × {{ cartLine.quantity }}</div>
            </div>
            <div class="cart-actions">
              <el-input-number v-model="cartLine.quantity" size="small" :min="1" :max="cartLine.stockQuantity" />
              <el-button link type="danger" @click="removeCartLine(cartLine.productId)">删除</el-button>
            </div>
          </div>
        </div>
        <div class="cart-total">
          <span class="cart-total-label">合计</span>
          <span class="cart-total-amount">{{ cartAmountText }}</span>
        </div>
        <div class="pay-method-label">支付方式</div>
        <el-radio-group v-model="payMethod" class="pay-method">
          <el-radio-button v-if="canCash" :value="StorePayMethod.CASH">现金</el-radio-button>
          <el-radio-button v-if="canMember" :value="StorePayMethod.MEMBER">会员余额</el-radio-button>
        </el-radio-group>
        <template v-if="payMethod === StorePayMethod.MEMBER">
          <div class="member-block">
            <div class="member-search">
              <el-input
                v-model="memberKeyword"
                size="large"
                placeholder="用户名/手机号/邮箱"
                clearable
                @keyup.enter="searchMember"
              />
              <el-button type="primary" size="large" class="member-search-button" @click="searchMember">查找</el-button>
              <ScanButton
                type="warning"
                size="large"
                class="cashier-scan-button"
                aria-label="扫码"
                @scanned="onPayQrScanned"
              >
                <AppIcon :icon-name="MenuIconName.SCAN_QR" />
                <span>扫码</span>
              </ScanButton>
            </div>
            <div v-if="isEmpty(selectedMember) !== true" class="member-card">
              <div class="member-card-name">
                <span v-if="isEmpty(selectedMember.nickname) !== true">{{ selectedMember.nickname }} </span>{{ selectedMember.username }}
              </div>
              <div class="member-card-balance">余额 {{ selectedMember.balance }}</div>
            </div>
            <div v-else-if="memberMissed" class="member-missed">没有找到会员</div>
          </div>
        </template>
        <el-input v-model="remark" class="remark-input" size="large" placeholder="备注（选填）" />
        <el-button
          type="primary"
          size="large"
          class="checkout-button"
          :disabled="checkoutDisabled"
          :loading="submitting"
          @click="submitSale"
        >
          收款 {{ cartAmountText }}
        </el-button>
      </section>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { MenuIconName, PageSetting, PermissionCode, RecordStatus, StorePayMethod } from '../../../utils/constants';
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
const payMethod = ref(canCash ? StorePayMethod.CASH : StorePayMethod.MEMBER);
const memberKeyword = ref('');
const selectedMember = ref<MemberRow | null>(null);
const memberMissed = ref(false);
const remark = ref('');
const submitting = ref(false);

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
 * 能不能点收款。
 */
const checkoutDisabled = computed(() => {
  if (isEmpty(cartLineList.value) || submitting.value) {
    return true;
  }
  if (payMethod.value === StorePayMethod.MEMBER && isEmpty(selectedMember.value)) {
    return true;
  }
  return false;
});

/**
 * 扫码写入搜索关键字并立刻查商品；仅命中一件可卖时直接加入购物车。
 */
async function onProductKeywordScanned(scanText: string): Promise<void> {
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
 * 查询可卖商品。
 */
async function loadProducts(): Promise<void> {
  const pageResult = (await http.get('/admin/store/products', {
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
 * 按关键字找会员。
 */
async function searchMember(): Promise<void> {
  memberMissed.value = false;
  selectedMember.value = null;
  const cleanedKeyword = memberKeyword.value.trim();
  if (isEmpty(cleanedKeyword)) {
    return;
  }
  try {
    selectedMember.value = (await http.get('/admin/store/members', {
      params: { keyword: cleanedKeyword },
    })) as MemberRow;
  } catch {
    memberMissed.value = true;
  }
}

/**
 * 扫付款码找会员。
 */
async function onPayQrScanned(cipherText: string): Promise<void> {
  memberMissed.value = false;
  selectedMember.value = null;
  try {
    selectedMember.value = (await http.post('/admin/store/pay-qr', { cipherText })) as MemberRow;
  } catch {
    memberMissed.value = true;
  }
}

/**
 * 提交销售单。成功后清空购物车并刷新商品库存。
 */
async function submitSale(): Promise<void> {
  if (checkoutDisabled.value) {
    return;
  }
  submitting.value = true;
  try {
    await http.post('/admin/store/sales', {
      payMethod: payMethod.value,
      memberId: payMethod.value === StorePayMethod.MEMBER && isEmpty(selectedMember.value) !== true ? selectedMember.value.memberId : '',
      remark: remark.value,
      itemList: cartLineList.value.map((cartLine) => ({
        productId: cartLine.productId,
        quantity: cartLine.quantity,
      })),
    });
    ElMessage.success('收款成功');
    cartLineList.value = [];
    remark.value = '';
    selectedMember.value = null;
    memberKeyword.value = '';
    await loadProducts();
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

.cashier-search,
.member-search {
  display: flex;
  align-items: stretch;
  gap: 10px;
  width: 100%;
}

.cashier-search {
  margin-bottom: 14px;
}

.cashier-search :deep(.el-input),
.cashier-search .cashier-scan-button,
.member-search :deep(.el-input),
.member-search .cashier-scan-button {
  flex: 1 1 0;
  min-width: 0;
  width: 100%;
}

.cashier-scan-button,
.member-search-button {
  height: 40px;
  margin: 0;
  border-radius: 8px;
  font-weight: 600;
}

.member-search-button {
  flex: none;
  min-width: 96px;
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
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px;
}

.product-card {
  padding: 14px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.product-card:hover:not(:disabled) {
  border-color: #c0c4cc;
  box-shadow: 0 2px 8px rgba(16, 24, 40, 0.06);
}

.product-card:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.product-name {
  font-weight: 600;
  color: #1c2434;
  word-break: break-word;
}

.product-price {
  margin-top: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #1c2434;
}

.product-meta {
  margin-top: 4px;
  color: #667085;
  font-size: 12px;
}

.cart-empty,
.record-empty,
.member-missed {
  padding: 28px 12px;
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
  gap: 10px;
  padding: 12px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #fff;
}

.cart-line-main {
  min-width: 0;
  flex: 1 1 auto;
}

.cart-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}

.cart-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #fff;
}

.cart-total-label {
  color: #667085;
  font-size: 13px;
}

.cart-total-amount {
  font-size: 22px;
  font-weight: 700;
  color: #1c2434;
}

.pay-method-label {
  margin-bottom: 8px;
  color: #667085;
  font-size: 13px;
}

.pay-method {
  display: flex;
  width: 100%;
  margin-bottom: 12px;
}

.pay-method :deep(.el-radio-button) {
  flex: 1;
}

.pay-method :deep(.el-radio-button__inner) {
  width: 100%;
}

.member-block {
  margin-bottom: 12px;
}

.member-search {
  margin-bottom: 10px;
}

.member-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #fff;
}

.member-card-name {
  font-weight: 600;
  color: #1c2434;
  word-break: break-word;
}

.member-card-balance {
  flex: none;
  color: #667085;
  font-size: 13px;
}

.member-missed {
  padding: 12px 0;
}

.remark-input {
  width: 100%;
  margin-bottom: 12px;
}

.checkout-button {
  width: 100%;
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

  .member-search {
    flex-wrap: wrap;
  }

  .member-search :deep(.el-input),
  .member-search .cashier-scan-button,
  .member-search-button {
    flex: 1 1 100%;
    min-width: 0;
  }
}
</style>
