<template>
  <el-card>
    <QueryBar @search="searchBills" @reset="resetQuery">
      <el-form-item>
        <el-select v-model="bizType" v-place class="query-keyword" clearable placeholder="流水类型">
          <el-option v-for="item in bizTypeOptions" :key="item" :label="statusLabel(item)" :value="item" />
        </el-select>
      </el-form-item>
    </QueryBar>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(billList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="billRow in billList" :key="billRow.billNo">
        <RecordField label="账单号">{{ billRow.billNo }}</RecordField>
        <RecordField label="会员ID">{{ billRow.memberId }}</RecordField>
        <RecordField label="类型">{{ statusLabel(billRow.bizType) }}</RecordField>
        <RecordField label="方向">{{ statusLabel(billRow.direction) }}</RecordField>
        <RecordField label="金额">{{ billRow.amount }}</RecordField>
        <RecordField label="变动前">{{ billRow.balanceBefore }}</RecordField>
        <RecordField label="变动后">{{ billRow.balanceAfter }}</RecordField>
        <RecordField label="业务单号">{{ billRow.bizOrderNo }}</RecordField>
        <RecordField label="备注">{{ billRow.remark }}</RecordField>
        <RecordField label="时间">{{ billRow.createdAt }}</RecordField>
      </RecordCard>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ListPager from '../../components/ListPager.vue';
import QueryBar from '../../components/QueryBar.vue';
import RecordCard from '../../components/RecordCard.vue';
import RecordField from '../../components/RecordField.vue';
import { FinanceBizType, PageSetting, statusLabel } from '../../utils/constants';
import { isEmpty } from '../../utils/tools';
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
 * 从第一页重新查询。
 */
function searchBills(): void {
  page.value = PageSetting.DEFAULT_PAGE;
  void loadBills();
}

/**
 * 清空流水类型并回到第一页。
 */
function resetQuery(): void {
  bizType.value = '';
  page.value = PageSetting.DEFAULT_PAGE;
  void loadBills();
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

