<template>
  <div class="deduct-page">
    <div class="deduct-panel">
      <div class="deduct-amount-label">扣款金额</div>
      <el-input v-model="amount" class="deduct-amount" placeholder="请输入金额" />
      <div class="deduct-amount-options">
        <button
          v-for="amountOption in deductAmountOptionList"
          :key="amountOption"
          type="button"
          class="deduct-amount-option"
          :class="{ 'is-active': amount === amountOption }"
          @click="fillAmount(amountOption)"
        >
          {{ amountOption }}
        </button>
      </div>
      <el-input v-model="remark" class="deduct-remark" placeholder="备注（选填）" />
      <el-button type="primary" class="deduct-submit" :disabled="isEmpty(amount) || deducting" @click="submitDeduct">扫码扣款</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { openScanGun } from '../../../components/ScanGunPrompt/scan-gun';
import { readScanCode } from '../../../utils/gv-sdk';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

interface MemberRow {
  memberId: string;
}

const deductAmountOptionList = ['100', '200', '500', '1000'];
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');

const amount = ref('');
const remark = ref('');
const deducting = ref(false);

/**
 * 把快捷金额填进输入框。
 */
function fillAmount(amountOption: string): void {
  amount.value = amountOption;
}

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
 * 先扫付款码找到会员，再按当前门店扣款。成功后清空金额和备注。
 */
async function submitDeduct(): Promise<void> {
  if (isEmpty(amount.value) || deducting.value) {
    return;
  }
  deducting.value = true;
  try {
    const cipherText = await readPayCipher();
    if (isEmpty(cipherText)) {
      return;
    }
    const memberRow = (await http.post('/admin/ktv/pay-qr', { cipherText })) as MemberRow;
    await http.post('/admin/ktv/deduct', {
      memberId: memberRow.memberId,
      amount: amount.value,
      remark: remark.value,
    });
    ElMessage.success('扣款成功');
    amount.value = '';
    remark.value = '';
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

.deduct-amount-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.deduct-amount-option {
  min-width: 72px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #e6e8ec;
  border-radius: 999px;
  background: #ffffff;
  color: #1c2434;
  font-size: 14px;
  cursor: pointer;
}

.deduct-amount-option.is-active {
  border-color: #2563eb;
  background: #e8f0fe;
  color: #2563eb;
}

.deduct-remark {
  margin-top: 16px;
}

.deduct-submit {
  width: 100%;
  height: 44px;
  margin-top: 20px;
  border-radius: 12px;
}
</style>
