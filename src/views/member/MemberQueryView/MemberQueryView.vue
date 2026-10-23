<template>
  <el-card>
    <QueryBar @search="searchMembers" @reset="resetQuery">
      <el-form-item>
        <el-input
          v-model="keyword"
          v-place
          class="query-keyword"
          placeholder="用户名/手机号/邮箱"
          clearable
        />
      </el-form-item>
      <template #append>
        <el-form-item v-if="canRecharge">
          <ScanButton type="warning" @scanned="onPayQrScanned">扫充值码</ScanButton>
        </el-form-item>
      </template>
    </QueryBar>
    <div v-if="isEmpty(chatUser) !== true" class="chat-user-block">
      <div class="chat-user-title">用户信息</div>
      <div class="chat-user-fields">
        <RecordField label="用户名">{{ chatUser?.username }}</RecordField>
        <RecordField label="昵称">{{ chatUser?.nickname }}</RecordField>
        <RecordField label="手机号">{{ chatUser?.phone }}</RecordField>
        <RecordField label="邮箱">{{ chatUser?.email }}</RecordField>
        <RecordField label="状态">{{ statusLabel(chatUser?.status || '') }}</RecordField>
      </div>
      <div v-if="canRecharge === true && isEmpty(memberList) && chatUserMissed !== true" class="chat-user-actions">
        <el-button type="primary" :loading="opening" @click="openAccount">开户</el-button>
      </div>
    </div>
    <div v-loading="loading" class="record-list record-list--wide-table">
      <div v-if="loading !== true && isEmpty(memberList)" class="record-empty">{{ emptyTip }}</div>
      <RecordCard v-for="memberRow in memberList" :key="memberRow.memberId">
        <RecordField label="用户名">{{ memberRow.username }}</RecordField>
        <RecordField label="昵称">{{ memberRow.nickname }}</RecordField>
        <RecordField label="联系方式">{{ memberRow.contact }}</RecordField>
        <RecordField label="余额">{{ memberRow.balance }}</RecordField>
        <RecordField label="状态">
          <el-tag :type="memberRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(memberRow.status) }}
          </el-tag>
        </RecordField>
        <template #actions>
          <el-button link type="primary" @click="syncMember(memberRow)">同步</el-button>
          <el-button
            v-if="canQuery === true"
            link
            type="primary"
            @click="toggleMemberStatus(memberRow)"
          >
            {{ memberRow.status === RecordStatus.ENABLED ? '停用' : '启用' }}
          </el-button>
          <el-button v-if="canRecharge === true" link type="primary" @click="goRecharge(memberRow)">去充值</el-button>
          <el-button link type="primary" @click="goMemberBill(memberRow)">流水</el-button>
        </template>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
  </el-card>
</template>

<script setup lang="ts">
import { MemberApi } from '../../../api/member';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import { useSessionStore } from '../../../stores/session';
import { PageSetting, PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
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
  nickname: string;
  phone: string;
  email: string;
  status: string;
}

const router = useRouter();
const sessionStore = useSessionStore();
const canQuery = sessionStore.hasPermission(PermissionCode.MEMBER_QUERY);
const canRecharge = sessionStore.hasPermission(PermissionCode.MEMBER_RECHARGE);

const keyword = ref('');
const exactUsername = ref('');
const chatUser = ref<ChatUserProfile | null>(null);
const chatUserMissed = ref(false);
const memberList = ref<MemberRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);
const loading = ref(false);
const opening = ref(false);

/**
 * 列表为空时的说明。区分未找到聊天用户、有聊天用户未开户、以及普通无数据。
 */
const emptyTip = computed(() => {
  if (chatUserMissed.value === true) {
    return '未找到该聊天用户';
  }
  if (isEmpty(chatUser.value) !== true) {
    return '该用户尚未开立 A380 账户';
  }
  return '暂无数据';
});

/**
 * 查询会员列表。有精确用户名时只查这一条。
 */
async function loadMembers(): Promise<void> {
  const queryParams: { keyword?: string; username?: string; page: number; pageSize: number } = {
    page: page.value,
    pageSize: pageSize.value,
  };
  if (isEmpty(exactUsername.value) !== true) {
    queryParams.username = exactUsername.value;
  } else {
    queryParams.keyword = keyword.value;
  }
  loading.value = true;
  try {
    const pageResult = (await http.get(MemberApi.LIST, {
      params: queryParams,
    })) as { list: MemberRow[]; total: number };
    memberList.value = pageResult.list;
    total.value = pageResult.total;
  } catch {
    memberList.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

/**
 * 先按关键字取聊天用户，再用用户名精确查询余额账户。关键字为空时列出全部账户。
 */
async function searchMembers(): Promise<void> {
  page.value = PageSetting.DEFAULT_PAGE;
  const cleanedKeyword = keyword.value.trim();
  if (isEmpty(cleanedKeyword)) {
    chatUser.value = null;
    chatUserMissed.value = false;
    exactUsername.value = '';
    await loadMembers();
    return;
  }
  loading.value = true;
  try {
    const chatUserProfile = (await http.get(MemberApi.CHAT_USER, {
      params: { keyword: cleanedKeyword },
    })) as ChatUserProfile;
    chatUser.value = chatUserProfile;
    chatUserMissed.value = false;
    exactUsername.value = chatUserProfile.username;
    await loadMembers();
  } catch {
    chatUser.value = null;
    chatUserMissed.value = true;
    exactUsername.value = '';
    memberList.value = [];
    total.value = 0;
    loading.value = false;
  }
}

/**
 * 扫付款码后按用户名查询。
 */
async function onPayQrScanned(cipherText: string): Promise<void> {
  try {
    const payQr = (await http.post(MemberApi.PAY_QR, { cipherText })) as { username: string };
    keyword.value = payQr.username;
    await searchMembers();
  } catch {
    chatUser.value = null;
    chatUserMissed.value = true;
    exactUsername.value = '';
    memberList.value = [];
    total.value = 0;
  }
}

/**
 * 聊天里有用户、A380 还没有账户时开户，开完刷新列表。
 */
async function openAccount(): Promise<void> {
  if (isEmpty(chatUser.value) || opening.value === true || canRecharge !== true) {
    return;
  }
  opening.value = true;
  try {
    await http.post(MemberApi.OPEN, {
      username: chatUser.value.username,
    });
    ElMessage.success('开户成功');
    await loadMembers();
  } finally {
    opening.value = false;
  }
}

/**
 * 把这一行的昵称和联系方式同步成聊天用户的当前值。
 */
async function syncMember(memberRow: MemberRow): Promise<void> {
  await ElMessageBox.confirm(`确认同步 ${memberRow.username} 的昵称和联系方式？`, '同步资料');
  const syncedMember = (await http.post(MemberApi.SYNC, {
    username: memberRow.username,
  })) as MemberRow;
  const memberIndex = memberList.value.findIndex((item) => item.memberId === memberRow.memberId);
  if (memberIndex < 0) {
    return;
  }
  memberList.value.splice(memberIndex, 1, syncedMember);
  ElMessage.success('同步成功');
}

/**
 * 启用或停用余额账户。
 */
async function toggleMemberStatus(memberRow: MemberRow): Promise<void> {
  if (canQuery !== true) {
    return;
  }
  const nextStatus = memberRow.status === RecordStatus.ENABLED ? RecordStatus.DISABLED : RecordStatus.ENABLED;
  const actionLabel = nextStatus === RecordStatus.ENABLED ? '启用' : '停用';
  await ElMessageBox.confirm(`确认${actionLabel} ${memberRow.username}？`, `${actionLabel}账户`);
  const updatedMember = (await http.post(MemberApi.STATUS, {
    memberId: memberRow.memberId,
    status: nextStatus,
  })) as MemberRow;
  const memberIndex = memberList.value.findIndex((item) => item.memberId === memberRow.memberId);
  if (memberIndex < 0) {
    return;
  }
  memberList.value.splice(memberIndex, 1, updatedMember);
  ElMessage.success(`${actionLabel}成功`);
}

/**
 * 带着用户名跳到充值页。
 */
function goRecharge(memberRow: MemberRow): void {
  void router.push({
    path: '/member/recharge',
    query: { username: memberRow.username },
  });
}

/**
 * 带着用户名跳到用户流水。
 */
function goMemberBill(memberRow: MemberRow): void {
  void router.push({
    path: '/finance/member-bill',
    query: { keyword: memberRow.username },
  });
}

/**
 * 清空关键字并回到第一页。
 */
function resetQuery(): void {
  keyword.value = '';
  exactUsername.value = '';
  chatUser.value = null;
  chatUserMissed.value = false;
  page.value = PageSetting.DEFAULT_PAGE;
  void loadMembers();
}

/**
 * 翻页后重新查询。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadMembers();
}

onMounted(() => {
  void loadMembers();
});
</script>

<style scoped>
.chat-user-block {
  margin-bottom: 16px;
  padding: 16px;
  background: #f7f8fa;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.chat-user-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #1c2434;
}

.chat-user-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px 24px;
}

.chat-user-actions {
  margin-top: 12px;
}
</style>
