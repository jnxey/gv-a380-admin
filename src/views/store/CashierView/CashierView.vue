<template>
  <ShopSwitcher />
  <el-card>
    <div class="cashier-layout">
      <section class="cashier-products">
        <div class="cashier-title">商品</div>
        <el-input v-model="keyword" class="cashier-search" placeholder="商品名称/条码" clearable @keyup.enter="loadProducts" />
        <div class="product-grid">
          <button
            v-for="productRow in productList"
            :key="productRow.productId"
            type="button"
            class="product-card"
            :disabled="productRow.stockQuantity < 1 || productRow.status !== RecordStatus.ENABLED"
            @click="addCartLine(productRow)"
          >
            <div class="product-name">{{ productRow.productName }}</div>
            <div class="product-meta">{{ productRow.salePrice }} · 库存 {{ productRow.stockQuantity }}</div>
          </button>
        </div>
      </section>
      <section class="cashier-cart">
        <div class="cashier-title">购物车</div>
        <div v-if="isEmpty(cartLineList)" class="record-empty">还没有商品</div>
        <div v-else class="cart-list">
          <div v-for="cartLine in cartLineList" :key="cartLine.productId" class="cart-line">
            <div>
              <div class="product-name">{{ cartLine.productName }}</div>
              <div class="product-meta">{{ cartLine.salePrice }} × {{ cartLine.quantity }}</div>
            </div>
            <div class="cart-actions">
              <el-input-number v-model="cartLine.quantity" :min="1" :max="cartLine.stockQuantity" />
              <el-button link type="danger" @click="removeCartLine(cartLine.productId)">删除</el-button>
            </div>
          </div>
        </div>
        <div class="cart-total">合计 {{ cartAmountText }}</div>
        <el-radio-group v-model="payMethod" class="pay-method">
          <el-radio v-if="canCash" :value="StorePayMethod.CASH">现金</el-radio>
          <el-radio v-if="canMember" :value="StorePayMethod.MEMBER">会员余额</el-radio>
        </el-radio-group>
        <template v-if="payMethod === StorePayMethod.MEMBER">
          <div class="member-search">
            <el-input v-model="memberKeyword" placeholder="用户名/手机号/邮箱" clearable @keyup.enter="searchMember" />
            <el-button type="primary" @click="searchMember">查找</el-button>
            <el-button @click="scanPayQr">扫码</el-button>
          </div>
          <div v-if="isEmpty(selectedMember) !== true" class="member-card">
            <div>{{ selectedMember.nickname }} {{ selectedMember.username }}</div>
            <div>余额 {{ selectedMember.balance }}</div>
          </div>
          <div v-else-if="memberMissed" class="record-empty">没有找到会员</div>
        </template>
        <el-input v-model="remark" class="remark-input" placeholder="备注（选填）" />
        <el-button type="primary" class="checkout-button" :disabled="checkoutDisabled" :loading="submitting" @click="submitSale">
          收款
        </el-button>
      </section>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { openScanGun } from '../../../components/ScanGunPrompt/scan-gun';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { PageSetting, PermissionCode, RecordStatus, StorePayMethod } from '../../../utils/constants';
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
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');
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
async function scanPayQr(): Promise<void> {
  memberMissed.value = false;
  selectedMember.value = null;
  let cipherText = '';
  const scanCode = readScanCode();
  if (narrowScreenQuery.matches === true && scanCode !== null) {
    try {
      const scanResult = await scanCode();
      cipherText = typeof scanResult === 'string' ? scanResult.trim() : '';
    } catch {
      return;
    }
  } else {
    cipherText = await openScanGun();
  }
  if (isEmpty(cipherText)) {
    return;
  }
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
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
}

.cashier-title {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
}

.cashier-search,
.remark-input,
.pay-method,
.checkout-button {
  width: 100%;
  margin-bottom: 12px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.product-card {
  padding: 12px;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.product-card:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.product-name {
  font-weight: 600;
  color: #1c2434;
}

.product-meta {
  margin-top: 4px;
  color: #667085;
  font-size: 12px;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.cart-line,
.cart-actions,
.member-search {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cart-total {
  margin: 12px 0;
  font-size: 22px;
  font-weight: 700;
}

.member-card {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f4f6f8;
}

.record-empty {
  padding: 20px 0;
  text-align: center;
  color: #98a2b3;
}

@media (max-width: 900px) {
  .cashier-layout {
    grid-template-columns: 1fr;
  }
}
</style>
