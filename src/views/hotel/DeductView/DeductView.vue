<template>
  <div class="deduct-page">
    <div v-if="isEmpty(deductedAmount)" class="deduct-panel">
      <div class="deduct-amount-label">付款金额</div>
      <el-input ref="amountInput" v-model="amount" class="deduct-amount" placeholder="请输入金额" @input="onAmountInput" @keydown="onDeductEnter" />
      <div class="deduct-remark-label">备注</div>
      <el-input v-model="remark" class="deduct-remark" placeholder="选填" @keydown="onDeductEnter" />
      <el-button type="primary" class="deduct-submit" :disabled="isEmpty(amount) || deducting" @click="submitDeduct">扫码付款</el-button>
    </div>
    <div v-else class="deduct-panel deduct-result">
      <div class="deduct-result-title">
        <span class="deduct-result-mark"></span>
        <span>付款成功</span>
      </div>
      <div class="deduct-result-amount">-{{ deductedAmount }}</div>
      <el-button class="deduct-close" type="primary" @click="emit('close')">关闭</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { openScanGun } from '../../../components/ScanGunPrompt/scan-gun';
import { readScanCode } from '../../../utils/gv-sdk';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

interface MemberRow {
  memberId: string;
}

const narrowScreenQuery = window.matchMedia('(max-width: 768px)');

const emit = defineEmits<{
  close: [];
}>();

const amountInput = ref<{ focus: () => void } | null>(null);
const amount = ref('');
const remark = ref('');
const deducting = ref(false);
const deductedAmount = ref('');

/**
 * 金额只留数字和一个小数点，小数最多两位。
 */
function keepMoneyText(rawText: string): string {
  const moneyText = rawText.replace(/[^\d.]/g, '');
  const dotIndex = moneyText.indexOf('.');
  if (dotIndex < 0) {
    return moneyText;
  }
  const wholeText = moneyText.slice(0, dotIndex);
  const fractionText = moneyText.slice(dotIndex + 1).replace(/\./g, '').slice(0, 2);
  return `${wholeText}.${fractionText}`;
}

/**
 * 输入金额时丢掉字母、符号和中文。
 */
function onAmountInput(value: string): void {
  amount.value = keepMoneyText(value);
}

/**
 * 弹窗打开动画结束后，把焦点放进金额输入框。
 */
function focusAmount(): void {
  amountInput.value?.focus();
}

/**
 * 物理 Enter 开始扫码。输入法还在组字时不触发。
 */
function onDeductEnter(keyboardEvent: KeyboardEvent): void {
  if (keyboardEvent.isComposing) {
    return;
  }
  if (keyboardEvent.code !== 'Enter' && keyboardEvent.code !== 'NumpadEnter') {
    return;
  }
  keyboardEvent.preventDefault();
  void submitDeduct();
}

defineExpose({
  focusAmount,
});

/**
 * 窄屏且宿主提供扫码时用相机，否则等扫码枪。取消或失焦返回空字符串。
 */
async function readPayCipher(): Promise<string> {
  const scanCode = readScanCode();
  if (narrowScreenQuery.matches === true && scanCode !== null) {
    try {
      const scanResult = await scanCode();
      if (typeof scanResult !== 'string') {
        return '';
      }
      return scanResult.trim();
    } catch (error) {
      if (error instanceof Error && error.message === 'cancelled') {
        return '';
      }
      return '';
    }
  }
  return openScanGun();
}

/**
 * 先扫付款码找到会员，再按当前门店付款。成功后留在结果页。
 */
async function submitDeduct(): Promise<void> {
  if (isEmpty(amount.value) || deducting.value) {
    return;
  }
  const paidAmount = amount.value.trim();
  deducting.value = true;
  try {
    const cipherText = await readPayCipher();
    if (isEmpty(cipherText)) {
      focusAmount();
      return;
    }
    const memberRow = (await http.post('/admin/hotel/pay-qr', { cipherText })) as MemberRow;
    await http.post('/admin/hotel/deduct', {
      memberId: memberRow.memberId,
      amount: paidAmount,
      remark: remark.value,
    });
    deductedAmount.value = paidAmount;
  } catch {
    return;
  } finally {
    deducting.value = false;
  }
}
</script>

<style scoped>
.deduct-page {
  box-sizing: border-box;
  max-height: calc(100vh - 180px);
  overflow: auto;
}

.deduct-panel {
  max-width: 420px;
  margin: 0 auto;
}

.deduct-amount-label {
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.deduct-amount {
  --el-input-text-color: #1c2434;
}

.deduct-amount :deep(.el-input__wrapper) {
  border-radius: 12px;
}

.deduct-remark :deep(.el-input__wrapper) {
  border-radius: 999px;
}

.deduct-amount :deep(.el-input__inner) {
  height: 56px;
  font-size: 28px;
  font-weight: 600;
  color: #1c2434;
}

.deduct-remark-label {
  margin-top: 16px;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.deduct-result-mark {
  width: 16px;
  height: 16px;
  flex: none;
  border-radius: 50%;
  background: #16a34a;
}

.deduct-result-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 22px;
  font-weight: 600;
  line-height: 32px;
  color: #1c2434;
}

.deduct-result-amount {
  margin-top: 8px;
  text-align: center;
  font-size: 40px;
  font-weight: 600;
  line-height: 48px;
  color: #1c2434;
}

.deduct-submit,
.deduct-close {
  width: 100%;
  height: 48px;
  margin-top: 20px;
  border-radius: 12px;
  font-weight: 600;
}

.deduct-submit {
  --el-button-bg-color: #2563eb;
  --el-button-border-color: #2563eb;
  --el-button-hover-bg-color: #1d4ed8;
  --el-button-hover-border-color: #1d4ed8;
  --el-button-active-bg-color: #1d4ed8;
  --el-button-active-border-color: #1d4ed8;
}
</style>
