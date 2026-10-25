<template>
  <section class="cashier-panel cashier-cart">
    <div class="cashier-title">购物车</div>
    <div v-if="isEmpty(cartLineList)" class="cart-empty">还没有商品，点左侧加入</div>
    <div v-else class="cart-list">
      <div v-for="cartLine in cartLineList" :key="cartLine.productId" class="cart-line">
        <div class="cart-line-main">
          <div class="cart-line-name">{{ cartLine.productName }}</div>
          <div class="cart-line-meta">
            <span>单价 {{ formatMoney(cartLine.salePrice) }}</span>
            <span class="cart-line-dot">·</span>
            <span>小计 {{ multiplyMoney(cartLine.salePrice, cartLine.quantity) }}</span>
          </div>
        </div>
        <div class="cart-actions">
          <el-input-number
            :model-value="cartLine.quantity"
            :min="1"
            :max="cartLine.stockQuantity"
            @update:model-value="changeCartLineQuantity(cartLine.productId, $event)"
          />
          <el-button
            class="cart-delete-button"
            link
            type="danger"
            aria-label="删除"
            @click="emit('remove', cartLine.productId)"
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
    <el-checkbox
      v-if="pointDeductVisible === true"
      class="point-deduct"
      :model-value="usePointDeduct"
      @change="emit('update:usePointDeduct', $event === true)"
    >
      {{ pointDeductHint }}
    </el-checkbox>
    <div class="checkout-actions">
      <el-button
        v-if="canCash"
        type="primary"
        size="large"
        class="checkout-button"
        :disabled="checkoutDisabled"
        :loading="submitting"
        @click="emit('cash')"
      >
        收款 {{ cartAmountText }}
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '../../../../components/AppIcon/AppIcon.vue';
import { MenuIconName } from '../../../../utils/constants';
import { formatMoney, isEmpty, multiplyMoney } from '../../../../utils/tools';

interface CartLine {
  productId: string;
  productName: string;
  salePrice: string;
  stockQuantity: number;
  quantity: number;
}

defineProps<{
  cartLineList: CartLine[];
  cartAmountText: string;
  pointDeductVisible: boolean;
  usePointDeduct: boolean;
  pointDeductHint: string;
  canCash: boolean;
  checkoutDisabled: boolean;
  submitting: boolean;
}>();

const emit = defineEmits<{
  remove: [productId: string];
  'change-quantity': [productId: string, quantity: number];
  cash: [];
  'update:usePointDeduct': [usePointDeduct: boolean];
}>();

/**
 * 把数量变更交给页面。清空时不改。
 */
function changeCartLineQuantity(productId: string, quantity: number | null | undefined): void {
  if (isEmpty(quantity)) {
    return;
  }
  emit('change-quantity', productId, quantity);
}
</script>

<style scoped>
.cashier-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 16px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #f9fafb;
}

.cashier-title {
  flex: none;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1c2434;
}

.cart-empty {
  flex: 1;
  min-height: 0;
  padding: 36px 12px;
  text-align: center;
  color: #98a2b3;
  font-size: 13px;
}

.cart-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
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

.point-deduct {
  flex: none;
  margin: 0 2px 14px;
  white-space: normal;
  height: auto;
}

.cart-total {
  flex: none;
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
  flex: none;
  flex-direction: column;
  gap: 10px;
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
  .cashier-panel {
    display: block;
    min-height: auto;
    overflow: visible;
  }

  .cart-empty,
  .cart-list {
    flex: none;
    min-height: auto;
  }

  .cart-list {
    max-height: 320px;
  }
}
</style>
