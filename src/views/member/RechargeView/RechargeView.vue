<template>
  <el-card class="recharge-page">
    <div class="recharge-panel">
      <template v-if="isEmpty(selectedMember)">
        <h2 class="recharge-title">查找会员</h2>
        <div class="recharge-search">
          <el-input
            v-model="keyword"
            class="recharge-search-input"
            placeholder="用户名/手机号/邮箱"
            clearable
            @keyup.enter="searchMember"
          />
          <el-button type="primary" class="recharge-search-button" aria-label="查找" @click="searchMember">
            <AppIcon :icon-name="MenuIconName.ARROW_RIGHT" />
          </el-button>
          <el-button type="warning" class="recharge-scan-button" aria-label="扫码" @click="scanPayQr">
            <AppIcon :icon-name="MenuIconName.SCAN_QR" />
          </el-button>
        </div>
        <div v-if="memberMissed === true" class="recharge-empty">没有找到会员</div>
      </template>
      <template v-else>
        <el-button class="recharge-back" @click="backToSearch">返回</el-button>
        <div class="member-summary">
          <div class="member-card-name">
            <span v-if="isEmpty(selectedMember.nickname) !== true">{{ selectedMember.nickname }} </span>{{ selectedMember.username }}
          </div>
          <div v-if="isEmpty(selectedMember.contact) !== true" class="member-card-meta">{{ selectedMember.contact }}</div>
          <div class="member-balance-label">余额</div>
          <div class="member-balance-value">{{ selectedMember.balance }}</div>
        </div>
        <div class="recharge-amount-label">充值金额</div>
        <el-input v-model="amount" class="recharge-amount" placeholder="请输入金额" />
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
import { ElMessage } from 'element-plus';
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
}

/**
 * 把快捷金额填进输入框。
 */
function fillAmount(amountOption: string): void {
  amount.value = amountOption;
}

/**
 * 按当前门店给会员入账，并按用户名刷新余额。
 */
async function submitRecharge(): Promise<void> {
  if (isEmpty(selectedMember.value) || isEmpty(amount.value)) {
    return;
  }
  const memberId = selectedMember.value.memberId;
  const username = selectedMember.value.username;
  await http.post('/admin/members/recharge', {
    memberId,
    amount: amount.value,
    remark: remark.value,
  });
  ElMessage.success('充值成功');
  amount.value = '';
  remark.value = '';
  const pageResult = (await http.get('/admin/members', {
    params: { username, page: PageSetting.DEFAULT_PAGE, pageSize: PageSetting.DEFAULT_PAGE_SIZE },
  })) as { list: MemberRow[] };
  const refreshedMember = pageResult.list.find((memberRow) => memberRow.memberId === memberId);
  if (!isEmpty(refreshedMember)) {
    selectedMember.value = refreshedMember;
  }
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
  gap: 16px;
}

.recharge-search-input :deep(.el-input__wrapper),
.recharge-remark :deep(.el-input__wrapper),
.recharge-amount :deep(.el-input__wrapper) {
  border-radius: 12px;
}

.recharge-search-input :deep(.el-input__wrapper) {
  min-height: 44px;
}

.recharge-search-input :deep(.el-input__inner) {
  height: 44px;
  font-size: 16px;
}

.recharge-search :deep(.el-button + .el-button) {
  margin-left: 0;
}

.recharge-search-button,
.recharge-scan-button {
  width: 100%;
  height: 44px;
  padding: 0;
  margin: 0;
  border-radius: 12px;
}

.recharge-search-button svg,
.recharge-scan-button svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.recharge-empty {
  margin-top: 24px;
  text-align: center;
  color: #667085;
}

.recharge-back {
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

.member-card-separator {
  margin: 0 8px;
  color: #d0d5dd;
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

.recharge-amount-label {
  margin-top: 20px;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 20px;
  color: #667085;
}

.recharge-amount :deep(.el-input__inner) {
  height: 48px;
  font-size: 24px;
  font-weight: 600;
}

.recharge-amount-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.recharge-amount-option {
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

.recharge-amount-option.is-active {
  border-color: #2563eb;
  background: #e8f0fe;
  color: #2563eb;
}

.recharge-remark {
  margin-top: 16px;
}

.recharge-submit {
  width: 100%;
  height: 44px;
  margin-top: 20px;
  border-radius: 12px;
}
</style>
