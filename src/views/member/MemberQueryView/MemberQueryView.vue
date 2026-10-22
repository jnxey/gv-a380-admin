<template>
  <el-card>
    <QueryBar @search="searchMembers" @reset="resetQuery">
      <el-form-item>
        <el-input v-model="keyword" v-place class="query-keyword" placeholder="用户名/手机号/邮箱" clearable />
      </el-form-item>
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
    </div>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(memberList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="memberRow in memberList" :key="memberRow.username">
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
        </template>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
  </el-card>
</template>

<script setup lang="ts">
import { MemberApi } from '../../../api/member';
import { onMounted, ref } from 'vue';
import ListPager from '../../../components/ListPager/ListPager.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { PageSetting, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

interface MemberRow {
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

const keyword = ref('');
const exactUsername = ref('');
const chatUser = ref<ChatUserProfile | null>(null);
const memberList = ref<MemberRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);

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
  const pageResult = (await http.get(MemberApi.LIST, {
    params: queryParams,
  })) as { list: MemberRow[]; total: number };
  memberList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 先按关键字取聊天用户，再用用户名精确查询余额账户。关键字为空时列出全部账户。
 */
async function searchMembers(): Promise<void> {
  page.value = PageSetting.DEFAULT_PAGE;
  const cleanedKeyword = keyword.value.trim();
  if (isEmpty(cleanedKeyword)) {
    chatUser.value = null;
    exactUsername.value = '';
    await loadMembers();
    return;
  }
  try {
    const chatUserProfile = (await http.get(MemberApi.CHAT_USER, {
      params: { keyword: cleanedKeyword },
    })) as ChatUserProfile;
    chatUser.value = chatUserProfile;
    exactUsername.value = chatUserProfile.username;
    await loadMembers();
  } catch {
    chatUser.value = null;
    exactUsername.value = '';
    memberList.value = [];
    total.value = 0;
  }
}

/**
 * 把这一行的昵称和联系方式同步成聊天用户的当前值。
 */
async function syncMember(memberRow: MemberRow): Promise<void> {
  const syncedMember = (await http.post(MemberApi.SYNC, {
    username: memberRow.username,
  })) as MemberRow;
  const memberIndex = memberList.value.findIndex((item) => item.username === memberRow.username);
  if (memberIndex < 0) {
    return;
  }
  memberList.value.splice(memberIndex, 1, syncedMember);
}

/**
 * 清空关键字并回到第一页。
 */
function resetQuery(): void {
  keyword.value = '';
  exactUsername.value = '';
  chatUser.value = null;
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
</style>
