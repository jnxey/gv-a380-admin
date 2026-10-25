<template>
  <el-card>
    <QueryBar @search="searchPointBills" @reset="resetQuery">
      <el-form-item>
        <el-input v-model="keyword" v-place class="query-keyword" placeholder="账号/手机号/邮箱" clearable />
      </el-form-item>
      <template #append>
        <el-form-item v-if="canRecharge === true">
          <ScanButton type="warning" @scanned="onPayQrScanned">扫充值码</ScanButton>
        </el-form-item>
      </template>
    </QueryBar>
    <section v-if="searched === true" class="point-user-card">
      <div class="point-user-title">用户信息</div>
      <div class="point-user-fields">
        <RecordField label="账号">{{ displayText(username) }}</RecordField>
        <RecordField label="积分账号">{{ isEmpty(pointsAccount) ? '未绑定' : pointsAccount }}</RecordField>
        <RecordField label="积分余额">{{ balance }}</RecordField>
      </div>
    </section>
    <div v-if="searched !== true" class="record-empty">请输入账号/手机号/邮箱</div>
    <div v-else-if="isEmpty(billList)" class="record-empty">暂无数据</div>
    <div v-else class="point-list">
      <article v-for="billRow in billList" :key="billRow.id" class="point-item">
        <div class="point-item-row">
          <div class="point-item-main">
            <el-tag :type="billRow.direction === FinanceDirection.IN ? 'success' : 'danger'" effect="plain" size="small">
              {{ statusLabel(billRow.direction) }}
            </el-tag>
            <span class="point-item-title">{{ displayText(billRow.bizType) }}</span>
          </div>
          <div class="point-item-amount" :class="billRow.direction === FinanceDirection.IN ? 'is-in' : 'is-out'">
            {{ billRow.direction === FinanceDirection.IN ? '+' : '-' }}{{ billRow.amount }}
          </div>
        </div>
        <div class="point-item-meta">
          <span>{{ billRow.createdAt }}</span>
          <span>变动后 {{ billRow.balanceAfter }}</span>
          <span v-if="isEmpty(billRow.remark) !== true">备注 {{ billRow.remark }}</span>
        </div>
      </article>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
  </el-card>
</template>

<script setup lang="ts">
import { MemberApi } from '../../../api/member';
import { PointApi } from '../../../api/point';
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import { useSessionStore } from '../../../stores/session';
import { FinanceDirection, PageSetting, PermissionCode, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

interface PointBillRow {
  id: string;
  bizType: string;
  direction: string;
  amount: string;
  balanceAfter: string;
  remark: string;
  createdAt: string;
}

interface PointBillPage {
  username: string;
  pointsAccount: string;
  balance: string;
  list: PointBillRow[];
  total: number;
}

const sessionStore = useSessionStore();
const canRecharge = sessionStore.hasPermission(PermissionCode.MEMBER_RECHARGE);
const keyword = ref('');
const searched = ref(false);
const username = ref('');
const pointsAccount = ref('');
const balance = ref('0');
const billList = ref<PointBillRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);

/**
 * 空文本显示成横线。
 */
function displayText(text: string): string {
  if (isEmpty(text)) {
    return '—';
  }
  return text;
}

/**
 * 按当前关键字查询积分账号、余额和这一页流水。
 */
async function loadPointBills(): Promise<void> {
  const cleanedKeyword = keyword.value.trim();
  if (isEmpty(cleanedKeyword)) {
    return;
  }
  const pageResult = (await http.get(PointApi.BILLS, {
    params: {
      keyword: cleanedKeyword,
      page: page.value,
      pageSize: pageSize.value,
    },
  })) as PointBillPage;
  searched.value = true;
  username.value = pageResult.username;
  pointsAccount.value = pageResult.pointsAccount;
  balance.value = pageResult.balance;
  billList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 扫充值码后按解出的账号查询积分。解密失败时清空本次结果。
 */
async function onPayQrScanned(cipherText: string): Promise<void> {
  try {
    const payQr = (await http.post(MemberApi.PAY_QR, { cipherText })) as { username: string };
    keyword.value = payQr.username;
    page.value = PageSetting.DEFAULT_PAGE;
    await loadPointBills();
  } catch {
    searched.value = false;
    username.value = '';
    pointsAccount.value = '';
    balance.value = '0';
    billList.value = [];
    total.value = 0;
  }
}

/**
 * 从第一页查询。没有关键字时只提示，不查全部账号。
 */
function searchPointBills(): void {
  const cleanedKeyword = keyword.value.trim();
  if (isEmpty(cleanedKeyword)) {
    ElMessage.warning('请输入账号/手机号/邮箱');
    return;
  }
  page.value = PageSetting.DEFAULT_PAGE;
  void loadPointBills();
}

/**
 * 清空关键字和查询结果。
 */
function resetQuery(): void {
  keyword.value = '';
  searched.value = false;
  username.value = '';
  pointsAccount.value = '';
  balance.value = '0';
  billList.value = [];
  total.value = 0;
  page.value = PageSetting.DEFAULT_PAGE;
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadPointBills();
}
</script>

<style scoped>
.point-user-card {
  margin-bottom: 16px;
  padding: 16px;
  background: #f7f8fa;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.point-user-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
}

.point-user-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px 24px;
}

.point-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.point-item {
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.point-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.point-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.point-item-title {
  font-size: 14px;
  font-weight: 600;
  color: #1c2434;
}

.point-item-amount {
  font-size: 16px;
  font-weight: 600;
}

.point-item-amount.is-in {
  color: #16a34a;
}

.point-item-amount.is-out {
  color: #dc2626;
}

.point-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 6px;
  color: #667085;
  font-size: 13px;
}

.record-empty {
  padding: 32px 0;
  text-align: center;
  color: #98a2b3;
}
</style>
