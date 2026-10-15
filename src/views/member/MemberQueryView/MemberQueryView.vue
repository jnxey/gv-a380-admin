<template>
  <el-card>
    <QueryBar @search="searchMembers" @reset="resetQuery">
      <el-form-item>
        <el-input v-model="keyword" v-place class="query-keyword" placeholder="手机号 / 会员号 / 姓名" clearable />
      </el-form-item>
    </QueryBar>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(memberList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="memberRow in memberList" :key="memberRow.memberNo">
        <RecordField label="会员号">{{ memberRow.memberNo }}</RecordField>
        <RecordField label="姓名">{{ memberRow.memberName }}</RecordField>
        <RecordField label="手机号">{{ memberRow.mobile }}</RecordField>
        <RecordField label="余额">{{ memberRow.balance }}</RecordField>
        <RecordField label="积分">{{ memberRow.points }}</RecordField>
        <RecordField label="状态">
          <el-tag :type="memberRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(memberRow.status) }}
          </el-tag>
        </RecordField>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ListPager from '../../../components/ListPager/ListPager.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { PageSetting, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

interface MemberRow {
  memberNo: string;
  memberName: string;
  mobile: string;
  balance: string;
  points: number;
  status: string;
}

const keyword = ref('');
const memberList = ref<MemberRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);

/**
 * 查询会员列表。
 */
async function loadMembers(): Promise<void> {
  const pageResult = (await http.get('/admin/members', {
    params: { keyword: keyword.value, page: page.value, pageSize: pageSize.value },
  })) as { list: MemberRow[]; total: number };
  memberList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 从第一页重新查询。
 */
function searchMembers(): void {
  page.value = PageSetting.DEFAULT_PAGE;
  void loadMembers();
}

/**
 * 清空关键字并回到第一页。
 */
function resetQuery(): void {
  keyword.value = '';
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

