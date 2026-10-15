<template>
  <el-card>
    <el-form inline @submit.prevent="loadMembers">
      <el-form-item label="关键字">
        <el-input v-model="keyword" placeholder="手机号 / 会员号 / 姓名" clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadMembers">查询</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="memberList" border>
      <el-table-column prop="memberNo" label="会员号" />
      <el-table-column prop="memberName" label="姓名" />
      <el-table-column prop="mobile" label="手机号" />
      <el-table-column prop="balance" label="余额" />
      <el-table-column prop="points" label="积分" />
      <el-table-column label="状态">
        <template #default="scope">{{ statusLabel(scope.row.status) }}</template>
      </el-table-column>
    </el-table>
    <el-pagination
      class="pager"
      layout="total, prev, pager, next"
      :total="total"
      :current-page="page"
      :page-size="pageSize"
      @current-change="onPageChange"
    />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { PageSetting, statusLabel } from '../../utils/constants';
import http from '../../utils/request';

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
.pager {
  margin-top: 16px;
}
</style>
