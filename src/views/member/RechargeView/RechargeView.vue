<template>
  <el-card class="recharge-page">
    <div class="recharge-panel">
      <div v-if="isEmpty(rechargedAmount) !== true" class="recharge-result">
        <div class="recharge-result-title">
          <span class="recharge-result-mark"></span>
          <span>充值成功</span>
        </div>
        <div class="recharge-result-amount">{{ rechargedAmount }}</div>
        <el-button class="recharge-result-back" type="primary" @click="backToSearch">返回</el-button>
      </div>
      <template v-else-if="isEmpty(selectedMember)">
        <h2 class="recharge-title">查找会员</h2>
        <div class="recharge-search">
          <el-input
            v-model="keyword"
            class="recharge-search-input"
            placeholder="用户名/手机号/邮箱"
            clearable
            @keyup.enter="searchMember"
          />
          <div class="recharge-search-actions">
            <el-button type="primary" class="recharge-search-button" aria-label="查找" @click="searchMember">
              <AppIcon :icon-name="MenuIconName.ARROW_RIGHT" />
              <span>查找</span>
            </el-button>
            <el-button type="warning" class="recharge-scan-button" aria-label="扫码" @click="scanPayQr">
              <AppIcon :icon-name="MenuIconName.SCAN_QR" />
              <span>扫码</span>
            </el-button>
          </div>
        </div>
        <div v-if="memberMissed === true" class="recharge-empty">没有找到会员</div>
      </template>
      <template v-else>
        <el-button class="recharge-back" text @click="backToSearch">返回</el-button>
        <div class="member-summary">
          <div class="member-summary-main">
            <div class="member-card-name">
              <span v-if="isEmpty(selectedMember.nickname) !== true">{{ selectedMember.nickname }} </span>{{ selectedMember.username }}
            </div>
            <div v-if="isEmpty(selectedMember.contact) !== true" class="member-card-meta">{{ selectedMember.contact }}</div>
          </div>
          <div class="member-summary-balance">
            <div class="member-balance-label">余额</div>
            <div class="member-balance-value">{{ selectedMember.balance }}</div>
          </div>
        </div>
        <div class="recharge-amount-label">充值金额</div>
        <el-input v-model="amount" class="recharge-amount" placeholder="请输入金额" @input="onAmountInput" />
        <div class="recharge-amount-options">
          <button
            v-for="amountOption in rechargeAmountOptionList"
            :key="amountOption"
            type="button"
            class="recharge-amount-option"
            :class="{ 'is-active': amount === amountOption }"
            @click="fillAmount(amountOption)"
          >
            {{ amountOption }}
          </button>
        </div>
        <el-input v-model="remark" class="recharge-remark" placeholder="备注（选填）" />
        <el-button type="primary" class="recharge-submit" :disabled="isEmpty(amount)" @click="submitRecharge">确认充值</el-button>
      </template>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import { openScanGun } from '../../../components/ScanGunPrompt/scan-gun';
import { MenuIconName, PageSetting } from '../../../utils/constants';
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

interface ChatUserProfile {
  username: string;
}

const rechargeAmountOptionList = ['100', '200', '500', '1000'];
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');

const keyword = ref('');
const memberMissed = ref(false);
const selectedMember = ref<MemberRow | null>(null);
const amount = ref('');
const remark = ref('');
const rechargedAmount = ref('');

/**
 * 窄屏且宿主提供扫码时用相机，否则等扫码枪。取消或空结果不提示。
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
 * 按用户名取唯一余额账户。没有或不止一条时留在查找。
 */
async function openMemberByUsername(username: string): Promise<void> {
  const pageResult = (await http.get('/admin/members', {
    params: { username, page: PageSetting.DEFAULT_PAGE, pageSize: PageSetting.DEFAULT_PAGE_SIZE },
  })) as { list: MemberRow[] };
  const exactMemberList = pageResult.list.filter((memberRow) => memberRow.username === username);
  if (exactMemberList.length !== 1) {
    memberMissed.value = true;
    selectedMember.value = null;
    return;
  }
  memberMissed.value = false;
  selectedMember.value = exactMemberList[0];
}

/**
 * 先按用户名、手机号或邮箱取聊天用户，再用用户名进入充值。
 */
async function searchMember(): Promise<void> {
  const cleanedKeyword = keyword.value.trim();
  if (isEmpty(cleanedKeyword)) {
    return;
  }
  try {
    const chatUserProfile = (await http.get('/admin/members/chat-user', {
      params: { keyword: cleanedKeyword },
    })) as ChatUserProfile;
    await openMemberByUsername(chatUserProfile.username);
  } catch {
    memberMissed.value = true;
    selectedMember.value = null;
  }
}

/**
 * 扫付款码。取消不提示。解开后按用户名进入充值。
 */
async function scanPayQr(): Promise<void> {
  const cipherText = await readPayCipher();
  if (isEmpty(cipherText)) {
    return;
  }
  try {
    const payQr = (await http.post('/admin/members/pay-qr', { cipherText })) as { username: string };
    await openMemberByUsername(payQr.username);
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
  rechargedAmount.value = '';
}

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
 * 把快捷金额填进输入框。
 */
function fillAmount(amountOption: string): void {
  amount.value = amountOption;
}

/**
 * 按当前门店给会员入账。成功后停在结果页。
 */
async function submitRecharge(): Promise<void> {
  if (isEmpty(selectedMember.value) || isEmpty(amount.value)) {
    return;
  }
  const paidAmount = amount.value.trim();
  await http.post('/admin/members/recharge', {
    memberId: selectedMember.value.memberId,
    amount: paidAmount,
    remark: remark.value,
  });
  rechargedAmount.value = paidAmount;
}

</script>

<style scoped>
.recharge-page {
  height: calc(100vh - 56px - 24px);
  box-sizing: border-box;
  overflow: auto;
}

.recharge-panel {
  max-width: 420px;
  margin: 0 auto;
}

.recharge-title {
  margin: 8px 0 20px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
  color: #1c2434;
}

.recharge-search {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.recharge-search-actions {
  display: flex;
  gap: 12px;
}

.recharge-search-input :deep(.el-input__wrapper),
.recharge-amount {
  --el-input-text-color: #1c2434;
}

.recharge-amount :deep(.el-input__wrapper) {
  border-radius: 12px;
}

.recharge-remark :deep(.el-input__wrapper) {
  border-radius: 999px;
}

.recharge-search-input :deep(.el-input__wrapper) {
  min-height: 44px;
}

.recharge-search-input :deep(.el-input__inner) {
  height: 44px;
  font-size: 16px;
}

.recharge-search-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.recharge-search-button,
.recharge-scan-button {
  flex: 1;
  height: 44px;
  margin: 0;
  border-radius: 12px;
  font-weight: 600;
}

.recharge-search-button svg,
.recharge-scan-button svg {
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

.recharge-empty {
  margin-top: 24px;
  text-align: center;
  color: #667085;
}

.recharge-back {
  height: auto;
  margin-bottom: 12px;
  padding: 0;
  color: #2563eb;
  font-weight: 600;
}

.member-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 16px;
  background: #f4f7fb;
}

.member-summary-main {
  min-width: 0;
}

.member-summary-balance {
  flex-shrink: 0;
  text-align: right;
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

.member-card-separator {
  margin: 0 8px;
  color: #d0d5dd;
}

.member-balance-label {
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.member-balance-value {
  margin-top: 2px;
  font-size: 28px;
  font-weight: 600;
  line-height: 36px;
  color: #1c2434;
}

.recharge-amount-label {
  margin-top: 20px;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.recharge-amount :deep(.el-input__inner) {
  height: 56px;
  font-size: 28px;
  font-weight: 600;
  color: #1c2434;
}

.recharge-amount-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.recharge-amount-option {
  height: 40px;
  padding: 0;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #ffffff;
  color: #1c2434;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.recharge-amount-option.is-active {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.recharge-remark {
  margin-top: 16px;
}

.recharge-submit,
.recharge-result-back {
  width: 100%;
  height: 48px;
  margin-top: 20px;
  border-radius: 12px;
  font-weight: 600;
  --el-button-bg-color: #2563eb;
  --el-button-border-color: #2563eb;
  --el-button-hover-bg-color: #1d4ed8;
  --el-button-hover-border-color: #1d4ed8;
  --el-button-active-bg-color: #1d4ed8;
  --el-button-active-border-color: #1d4ed8;
}

.recharge-result-mark {
  width: 16px;
  height: 16px;
  flex: none;
  border-radius: 50%;
  background: #16a34a;
}

.recharge-result-title {
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

.recharge-result-amount {
  margin-top: 8px;
  text-align: center;
  font-size: 40px;
  font-weight: 600;
  line-height: 48px;
  color: #1c2434;
}
</style>
