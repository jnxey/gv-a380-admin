<template>
  <div class="deduct-page">
    <div class="deduct-panel">
      <template v-if="isEmpty(selectedMember)">
        <h2 class="deduct-title">查找会员</h2>
        <div class="deduct-search">
          <el-input
            v-model="keyword"
            class="deduct-search-input"
            placeholder="用户名/手机号/邮箱"
            clearable
            @keyup.enter="searchMember"
          />
          <el-button type="primary" class="deduct-search-button" aria-label="查找" @click="searchMember">
            <AppIcon :icon-name="MenuIconName.ARROW_RIGHT" />
          </el-button>
          <el-button v-if="showScanButton" type="warning" class="deduct-scan-button" aria-label="扫码" @click="scanPayQr">
            <AppIcon :icon-name="MenuIconName.SCAN_QR" />
          </el-button>
        </div>
        <div v-if="memberMissed === true" class="deduct-empty">没有找到会员</div>
      </template>
      <template v-else>
        <el-button class="deduct-back" @click="backToSearch">返回</el-button>
        <div class="member-summary">
          <div class="member-card-name">
            <span v-if="isEmpty(selectedMember.nickname) !== true">{{ selectedMember.nickname }} </span>{{ selectedMember.username }}
          </div>
          <div v-if="isEmpty(selectedMember.contact) !== true" class="member-card-meta">{{ selectedMember.contact }}</div>
          <div class="member-balance-label">余额</div>
          <div class="member-balance-value">{{ selectedMember.balance }}</div>
        </div>
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
        <el-button type="primary" class="deduct-submit" :disabled="isEmpty(amount)" @click="submitDeduct">确认扣款</el-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import { MenuIconName } from '../../../utils/constants';
import { readScanCode } from '../../../utils/gv-sdk';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

interface MemberRow {
  memberId: string;
  username: string;
  nickname: string;
  contact: string;
  balance: string;
}

const deductAmountOptionList = ['100', '200', '500', '1000'];
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');

const keyword = ref('');
const memberMissed = ref(false);
const selectedMember = ref<MemberRow | null>(null);
const amount = ref('');
const remark = ref('');
const narrowScreen = ref(false);
const scanReady = ref(false);
const showScanButton = computed(() => narrowScreen.value === true && scanReady.value === true);

/**
 * 窄屏且宿主提供扫码时才显示二维码按钮。
 */
function syncScanButton(): void {
  narrowScreen.value = narrowScreenQuery.matches;
  scanReady.value = readScanCode() !== null;
}

/**
 * 按用户名、手机号或邮箱查找会员。没有找到时留在查找。
 */
async function searchMember(): Promise<void> {
  const cleanedKeyword = keyword.value.trim();
  if (isEmpty(cleanedKeyword)) {
    return;
  }
  try {
    const memberRow = (await http.get('/admin/ktv/members', {
      params: { keyword: cleanedKeyword },
    })) as MemberRow;
    memberMissed.value = false;
    selectedMember.value = memberRow;
  } catch {
    memberMissed.value = true;
    selectedMember.value = null;
  }
}

/**
 * 扫付款码。取消不提示。无效码由接口提示。
 */
async function scanPayQr(): Promise<void> {
  const scanCode = readScanCode();
  if (scanCode === null) {
    return;
  }
  let cipherText = '';
  try {
    const scanResult = await scanCode();
    if (typeof scanResult !== 'string') {
      return;
    }
    cipherText = scanResult.trim();
  } catch (error) {
    if (error instanceof Error && error.message === 'cancelled') {
      return;
    }
    return;
  }
  if (isEmpty(cipherText)) {
    return;
  }
  try {
    const memberRow = (await http.post('/admin/ktv/pay-qr', { cipherText })) as MemberRow;
    memberMissed.value = false;
    selectedMember.value = memberRow;
  } catch {
    memberMissed.value = false;
  }
}

/**
 * 返回查找，并清空金额和备注。
 */
function backToSearch(): void {
  selectedMember.value = null;
  memberMissed.value = false;
  amount.value = '';
  remark.value = '';
}

/**
 * 把快捷金额填进输入框。
 */
function fillAmount(amountOption: string): void {
  amount.value = amountOption;
}

/**
 * 按当前门店扣减余额，并用返回的会员资料刷新余额。
 */
async function submitDeduct(): Promise<void> {
  if (isEmpty(selectedMember.value) || isEmpty(amount.value)) {
    return;
  }
  const memberRow = (await http.post('/admin/ktv/deduct', {
    memberId: selectedMember.value.memberId,
    amount: amount.value,
    remark: remark.value,
  })) as MemberRow;
  ElMessage.success('扣款成功');
  amount.value = '';
  remark.value = '';
  selectedMember.value = memberRow;
}

onMounted(() => {
  syncScanButton();
  narrowScreenQuery.addEventListener('change', syncScanButton);
  window.addEventListener('gv-sdk-ready', syncScanButton);
});

onBeforeUnmount(() => {
  narrowScreenQuery.removeEventListener('change', syncScanButton);
  window.removeEventListener('gv-sdk-ready', syncScanButton);
});
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

.deduct-title {
  margin: 8px 0 20px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
  color: #1c2434;
}

.deduct-search {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
}

.deduct-search-input :deep(.el-input__wrapper),
.deduct-remark :deep(.el-input__wrapper),
.deduct-amount :deep(.el-input__wrapper) {
  border-radius: 12px;
}

.deduct-search-input :deep(.el-input__wrapper) {
  min-height: 44px;
}

.deduct-search-input :deep(.el-input__inner) {
  height: 44px;
  font-size: 16px;
}

.deduct-search :deep(.el-button + .el-button) {
  margin-left: 0;
}

.deduct-search-button,
.deduct-scan-button {
  width: 100%;
  height: 44px;
  padding: 0;
  margin: 0;
  border-radius: 12px;
}

.deduct-search-button svg,
.deduct-scan-button svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.deduct-empty {
  margin-top: 24px;
  text-align: center;
  color: #667085;
}

.deduct-back {
  width: 100%;
  height: 44px;
  margin-bottom: 16px;
  border-radius: 12px;
}

.member-summary {
  padding: 16px;
  border: 1px solid #e6e8ec;
  border-radius: 16px;
  background: #ffffff;
}

.member-card-name {
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: #1c2434;
}

.member-card-meta {
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.member-balance-label {
  margin-top: 16px;
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.member-balance-value {
  margin-top: 4px;
  font-size: 32px;
  font-weight: 600;
  line-height: 40px;
  color: #1c2434;
}

.deduct-amount-label {
  margin-top: 20px;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 20px;
  color: #667085;
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
