<template>
  <el-card>
    <el-form class="query-bar" inline @submit.prevent="searchMembers">
      <el-form-item label="关键字">
        <el-input v-model="keyword" class="query-keyword" placeholder="手机号 / 会员号 / 姓名" clearable>
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item class="query-actions">
        <el-button type="primary" @click="searchMembers">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="memberList" stripe>
      <el-table-column prop="memberNo" label="会员号"  min-width="160" show-overflow-tooltip />
      <el-table-column prop="memberName" label="姓名" min-width="120" show-overflow-tooltip />
      <el-table-column prop="mobile" label="手机号"  min-width="140" />
      <el-table-column prop="balance" label="余额"  min-width="120" />
      <el-table-column prop="points" label="积分"  min-width="100" />
      <el-table-column label="状态"  min-width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      class="pager"
      layout="total, prev, pager, next"
      background
      :total="total"
      :current-page="page"
      :page-size="pageSize"
      :page-sizes="pageSizeOptions"
      @current-change="onPageChange"
      @size-change="onPageSizeChange"
    />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { PageSetting, RecordStatus, statusLabel } from '../../utils/constants';
import http from '../../utils/request';

interface MemberRow {
  memberNo: string;
  memberName: string;
  mobile: string;
  balance: string;
  points: number;
  status: string;
}

const pageSizeOptions = [PageSetting.DEFAULT_PAGE_SIZE, 20, 50];
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

/**
 * 修改每页条数后回到第一页。
 */
function onPageSizeChange(nextPageSize: number): void {
  pageSize.value = nextPageSize;
  page.value = PageSetting.DEFAULT_PAGE;
  void loadMembers();
}

onMounted(() => {
  void loadMembers();
});
</script>

<style scoped>
.query-bar {
  margin-bottom: 16px;
  padding: 16px 16px 0;
  background: #f5f7fa;
  border-radius: 8px;
}

.query-keyword {
  width: 280px;
}

.query-actions :deep(.el-form-item__content) {
  flex-wrap: nowrap;
}

.pager {
  margin-top: 16px;
}
</style>
