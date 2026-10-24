<template>
  <el-card class="recharge-page">
    <div class="recharge-panel">
      <div v-if="isEmpty(rechargedAmount) !== true" class="recharge-result">
        <div class="recharge-result-title">
          <span class="recharge-result-mark"></span>
          <span>充值成功</span>
        </div>
        <div class="recharge-result-amount">{{ rechargedAmount }}</div>
        <div v-if="isEmpty(rechargedBalance) !== true" class="recharge-result-balance">当前余额 {{ rechargedBalance }}</div>
        <el-button class="recharge-result-back" type="primary" @click="backToSearch">返回</el-button>
      </div>
      <template v-else-if="isEmpty(selectedMember)">
        <h2 class="recharge-title">查找会员</h2>
        <div class="recharge-shop-tip">门店：{{ ShopType.A380 }}</div>
        <div class="recharge-search">
          <el-input
            v-model="keyword"
            class="recharge-search-input"
            placeholder="账号/手机号/邮箱"
            clearable
            @keyup.enter="searchMember"
          />
          <div class="recharge-search-actions">
            <el-button type="primary" class="recharge-search-button" aria-label="查找" :loading="searching" @click="searchMember">
              <AppIcon :icon-name="MenuIconName.ARROW_RIGHT" />
              <span>查找</span>
            </el-button>
            <ScanButton type="warning" class="recharge-scan-button" aria-label="扫充值码" :disabled="searching" @scanned="onPayQrScanned">
              扫充值码
            </ScanButton>
          </div>
        </div>
        <div v-if="isEmpty(missTip) !== true" class="recharge-empty">
          <div>{{ missTip }}</div>
          <el-button v-if="showGoQuery === true" class="recharge-empty-action" link type="primary" @click="goMemberQuery">
            去 A380 查询
          </el-button>
        </div>
      </template>
      <template v-else>
        <div class="recharge-shop-tip">门店：{{ ShopType.A380 }}</div>
        <div class="member-summary">
          <div class="member-summary-main">
            <div class="member-card-name">
              <span v-if="isEmpty(selectedMember.nickname) !== true">{{ selectedMember.nickname }} </span>{{ selectedMember.username }}
            </div>
            <div v-if="isEmpty(selectedMember.contact) !== true" class="member-card-meta">{{ selectedMember.contact }}</div>
            <div class="member-card-status">
              <el-tag :type="selectedMember.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
                {{ statusLabel(selectedMember.status) }}
              </el-tag>
            </div>
          </div>
          <div class="member-summary-balance">
            <div class="member-balance-label">余额</div>
            <div class="member-balance-value">{{ selectedMember.balance }}</div>
          </div>
        </div>
        <div class="recharge-amount-label">充值金额</div>
        <el-input ref="amountInput" v-model="amount" class="recharge-amount" placeholder="请输入金额" @input="onAmountInput" />
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
        <div class="recharge-actions">
          <el-button class="recharge-back" :disabled="submitting" @click="backToSearch">返回</el-button>
          <el-button
            type="primary"
            class="recharge-submit"
            :loading="submitting"
            :disabled="isEmpty(amount) || submitting === true"
            @click="submitRecharge"
          >
            确认充值
          </el-button>
        </div>
      </template>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { MemberApi } from '../../../api/member';
import { nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import { MenuIconName, PageSetting, RecordStatus, ShopType, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

interface MemberRow {
  memberId: string;
  username: string;
  nickname: string;
  contact: string;
  balance: string;
  status: string;
}

interface ChatUserProfile {
  username: string;
}

interface RechargeBill {
  amount: string;
  balanceAfter: string;
}

/** 按账号打开账户的结果。 */
type OpenMemberResult = 'opened' | 'missing' | 'disabled' | 'ambiguous';

const route = useRoute();
const router = useRouter();
const rechargeAmountOptionList = ['100', '200', '500', '1000'];

const keyword = ref('');
const missTip = ref('');
const showGoQuery = ref(false);
const selectedMember = ref<MemberRow | null>(null);
const amountInput = ref<{ focus: () => void } | null>(null);
const amount = ref('');
const remark = ref('');
const rechargedAmount = ref('');
const rechargedBalance = ref('');
const searching = ref(false);
const submitting = ref(false);

/**
 * 进入充值步骤后，把焦点放进金额输入框。
 */
function focusAmount(): void {
  amountInput.value?.focus();
}

watch(selectedMember, (member) => {
  if (isEmpty(member)) {
    return;
  }
  void nextTick(() => {
    focusAmount();
  });
});

/**
 * 记下查找失败原因，并清空已选会员。
 */
function setMiss(tip: string, needGoQuery: boolean): void {
  missTip.value = tip;
  showGoQuery.value = needGoQuery;
  selectedMember.value = null;
}

/**
 * 清空查找失败提示。
 */
function clearMiss(): void {
  missTip.value = '';
  showGoQuery.value = false;
}

/**
 * 从请求失败结果里取出后端文案。
 */
function readFailMessage(error: unknown): string {
  if (isEmpty(error) || typeof error !== 'object') {
    return '';
  }
  const errorRecord = error as { message?: unknown; response?: { data?: { message?: unknown } } };
  if (typeof errorRecord.message === 'string' && isEmpty(errorRecord.message) !== true) {
    return errorRecord.message;
  }
  const responseMessage = errorRecord.response?.data?.message;
  if (typeof responseMessage === 'string' && isEmpty(responseMessage) !== true) {
    return responseMessage;
  }
  return '';
}

/**
 * 按账号取唯一余额账户。停用的不进入充值；没有或不止一条时留在查找。
 */
async function openMemberByUsername(username: string): Promise<OpenMemberResult> {
  const pageResult = (await http.get(MemberApi.LIST, {
    params: { username, page: PageSetting.DEFAULT_PAGE, pageSize: PageSetting.DEFAULT_PAGE_SIZE },
  })) as { list: MemberRow[] };
  const exactMemberList = pageResult.list.filter((memberRow) => memberRow.username === username);
  if (exactMemberList.length === 0) {
    return 'missing';
  }
  if (exactMemberList.length !== 1) {
    setMiss('没有找到会员', false);
    return 'ambiguous';
  }
  const exactMember = exactMemberList[0];
  if (exactMember.status === RecordStatus.DISABLED) {
    setMiss('会员已停用，请先在 A380 查询页启用', true);
    return 'disabled';
  }
  clearMiss();
  selectedMember.value = exactMember;
  return 'opened';
}

/**
 * 聊天里有用户、A380 还没有账户时开户。停用账户会失败并提示去查询页。
 */
async function openAccountByUsername(username: string): Promise<void> {
  try {
    const openedMember = (await http.post(MemberApi.OPEN, {
      username,
    })) as MemberRow;
    clearMiss();
    selectedMember.value = openedMember;
    ElMessage.success('已开户');
  } catch (error) {
    const failMessage = readFailMessage(error);
    if (failMessage === '会员已停用') {
      setMiss('会员已停用，请先在 A380 查询页启用', true);
      return;
    }
    setMiss(isEmpty(failMessage) ? '开户失败' : failMessage, false);
  }
}

/**
 * 先按账号、手机号或邮箱取聊天用户，再用账号进入充值。聊天里有、A380 还没有账户时先开户。
 */
async function searchMember(): Promise<void> {
  const cleanedKeyword = keyword.value.trim();
  if (isEmpty(cleanedKeyword)) {
    ElMessage.warning('请输入账号/手机号/邮箱');
    return;
  }
  if (searching.value === true) {
    return;
  }
  searching.value = true;
  clearMiss();
  try {
    const chatUserProfile = (await http.get(MemberApi.CHAT_USER, {
      params: { keyword: cleanedKeyword },
    })) as ChatUserProfile;
    const openResult = await openMemberByUsername(chatUserProfile.username);
    if (openResult !== 'missing') {
      return;
    }
    await openAccountByUsername(chatUserProfile.username);
  } catch {
    setMiss('未找到该聊天用户', false);
  } finally {
    searching.value = false;
  }
}

/**
 * 扫付款码解开后按账号进入充值。A380 还没有账户时先开户。
 */
async function onPayQrScanned(cipherText: string): Promise<void> {
  if (searching.value === true) {
    return;
  }
  searching.value = true;
  clearMiss();
  try {
    const payQr = (await http.post(MemberApi.PAY_QR, { cipherText })) as { username: string };
    const openResult = await openMemberByUsername(payQr.username);
    if (openResult !== 'missing') {
      return;
    }
    await openAccountByUsername(payQr.username);
  } catch {
    setMiss('付款码无效或已过期', false);
  } finally {
    searching.value = false;
  }
}

/**
 * 带着关键字去 A380 查询页处理停用账户。
 */
function goMemberQuery(): void {
  void router.push({
    path: '/member/query',
    query: isEmpty(keyword.value.trim()) ? {} : { keyword: keyword.value.trim() },
  });
}

/**
 * 返回查找，并清空金额和备注。
 */
function backToSearch(): void {
  selectedMember.value = null;
  clearMiss();
  amount.value = '';
  remark.value = '';
  rechargedAmount.value = '';
  rechargedBalance.value = '';
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
 * 金额是否大于 0。
 */
function isPositiveRechargeAmount(amountText: string): boolean {
  const amountNumber = Number(amountText);
  if (Number.isFinite(amountNumber) !== true) {
    return false;
  }
  return amountNumber > 0;
}

/**
 * 确认后给会员入账。流水由服务端记到 A380 中心。成功后停在结果页，并展示最新余额。
 */
async function submitRecharge(): Promise<void> {
  if (isEmpty(selectedMember.value) || isEmpty(amount.value) || submitting.value === true) {
    return;
  }
  if (selectedMember.value.status === RecordStatus.DISABLED) {
    ElMessage.warning('会员已停用，请先在 A380 查询页启用');
    return;
  }
  const paidAmount = amount.value.trim();
  if (isPositiveRechargeAmount(paidAmount) !== true) {
    ElMessage.warning('充值金额必须大于0');
    return;
  }
  const memberName = isEmpty(selectedMember.value.nickname)
    ? selectedMember.value.username
    : `${selectedMember.value.nickname}（${selectedMember.value.username}）`;
  await ElMessageBox.confirm(
    `确认为 ${memberName} 充值 ${paidAmount}？\n门店：${ShopType.A380}`,
    '确认充值',
  );
  submitting.value = true;
  try {
    const financeBill = (await http.post(MemberApi.RECHARGE, {
      memberId: selectedMember.value.memberId,
      amount: paidAmount,
      remark: remark.value,
    })) as RechargeBill;
    rechargedAmount.value = paidAmount;
    rechargedBalance.value = financeBill.balanceAfter;
  } finally {
    submitting.value = false;
  }
}

/**
 * 查询页「去充值」已带精确账号，直接打开账户，不再走聊天用户解析。
 */
async function openMemberFromQuery(): Promise<void> {
  const usernameFromQuery = route.query.username;
  if (typeof usernameFromQuery !== 'string' || isEmpty(usernameFromQuery)) {
    return;
  }
  const cleanedUsername = usernameFromQuery.trim();
  keyword.value = cleanedUsername;
  if (searching.value === true) {
    return;
  }
  searching.value = true;
  clearMiss();
  try {
    const openResult = await openMemberByUsername(cleanedUsername);
    if (openResult === 'missing') {
      setMiss('没有找到会员', false);
    }
  } catch {
    setMiss('没有找到会员', false);
  } finally {
    searching.value = false;
  }
}

onMounted(() => {
  void openMemberFromQuery();
});
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
  margin: 8px 0 12px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
  color: #1c2434;
}

.recharge-shop-tip {
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 20px;
  color: #667085;
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

.recharge-empty-action {
  margin-top: 8px;
}

.recharge-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.recharge-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.recharge-back {
  flex: none;
  height: 48px;
  margin: 0;
  padding: 0 20px;
  border-radius: 12px;
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

.member-card-status {
  margin-top: 8px;
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

.recharge-submit {
  flex: 1;
  height: 48px;
  margin: 0;
  border-radius: 12px;
  font-weight: 600;
  --el-button-bg-color: #2563eb;
  --el-button-border-color: #2563eb;
  --el-button-hover-bg-color: #1d4ed8;
  --el-button-hover-border-color: #1d4ed8;
  --el-button-active-bg-color: #1d4ed8;
  --el-button-active-border-color: #1d4ed8;
}

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

.recharge-result-balance {
  margin-top: 8px;
  text-align: center;
  font-size: 14px;
  line-height: 22px;
  color: #667085;
}
</style>
