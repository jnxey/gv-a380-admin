<template>
  <div class="deduct-page">
    <div v-if="isEmpty(deductedAmount)" class="deduct-panel">
      <div class="deduct-amount-label">扣款金额</div>
      <el-input ref="amountInput" v-model="amount" class="deduct-amount" placeholder="请输入金额" @keydown.enter="submitDeduct" />
      <el-input v-model="remark" class="deduct-remark" placeholder="备注（选填）" @keydown.enter="submitDeduct" />
      <el-button type="primary" class="deduct-submit" :disabled="isEmpty(amount) || deducting" @click="submitDeduct">扫码扣款</el-button>
    </div>
    <div v-else class="deduct-panel deduct-result">
      <div class="deduct-result-title">扣款成功</div>
      <div class="deduct-result-amount">{{ deductedAmount }}</div>
      <el-button class="deduct-submit" @click="emit('close')">关闭</el-button>
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
 * 弹窗打开动画结束后，把焦点放进金额输入框。
 */
function focusAmount(): void {
  amountInput.value?.focus();
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
 * 先扫付款码找到会员，再按当前门店扣款。成功后留在结果页。
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
      return;
    }
    const memberRow = (await http.post('/admin/ktv/pay-qr', { cipherText })) as MemberRow;
    await http.post('/admin/ktv/deduct', {
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

.deduct-remark :deep(.el-input__wrapper),
.deduct-amount :deep(.el-input__wrapper) {
  border-radius: 12px;
}

.deduct-amount :deep(.el-input__inner) {
  height: 48px;
  font-size: 24px;
  font-weight: 600;
}

.deduct-remark {
  margin-top: 16px;
}

.deduct-result-title {
  text-align: center;
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

.deduct-submit {
  width: 100%;
  height: 44px;
  margin-top: 20px;
  border-radius: 12px;
}
</style>
