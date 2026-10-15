<template>
  <el-card>
    <el-form inline>
      <el-form-item label="流水类型">
        <el-select v-model="bizType" clearable placeholder="全部" style="width: 180px">
          <el-option v-for="item in bizTypeOptions" :key="item" :label="statusLabel(item)" :value="item" />
        </el-select>
      </el-form-item>
      <el-button type="primary" @click="loadBills">查询</el-button>
    </el-form>
    <el-table :data="billList" border>
      <el-table-column prop="billNo" label="账单号" min-width="180" />
      <el-table-column prop="memberId" label="会员ID" />
      <el-table-column label="类型">
        <template #default="scope">{{ statusLabel(scope.row.bizType) }}</template>
      </el-table-column>
      <el-table-column label="方向">
        <template #default="scope">{{ statusLabel(scope.row.direction) }}</template>
      </el-table-column>
      <el-table-column prop="amount" label="金额" />
      <el-table-column prop="balanceBefore" label="变动前" />
      <el-table-column prop="balanceAfter" label="变动后" />
      <el-table-column prop="bizOrderNo" label="业务单号" min-width="160" />
      <el-table-column prop="remark" label="备注" />
      <el-table-column prop="createdAt" label="时间" min-width="160" />
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
import { FinanceBizType, PageSetting, statusLabel } from '../../utils/constants';
import http from '../../utils/request';

interface BillRow {
  billNo: string;
  memberId: string;
  bizType: string;
  direction: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  bizOrderNo: string;
  remark: string;
  createdAt: string;
}

const bizType = ref('');
const bizTypeOptions = Object.values(FinanceBizType);
const billList = ref<BillRow[]>([]);
const total = ref(0);
const page = ref<number>(PageSetting.DEFAULT_PAGE);
const pageSize = ref<number>(PageSetting.DEFAULT_PAGE_SIZE);

/**
 * 查询当前门店财务流水。
 */
async function loadBills(): Promise<void> {
  const pageResult = (await http.get('/admin/finance/bills', {
    params: { bizType: bizType.value, page: page.value, pageSize: pageSize.value },
  })) as { list: BillRow[]; total: number };
  billList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadBills();
}

onMounted(() => {
  void loadBills();
});
</script>

<style scoped>
.pager {
  margin-top: 16px;
}
</style>
