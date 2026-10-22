<template>
  <ShopSwitcher />
  <el-card>
    <div v-if="isEmpty(saleList)" class="record-empty">暂无数据</div>
    <div v-else class="sale-list">
      <article v-for="saleRow in saleList" :key="saleRow.saleId" class="sale-card">
        <div class="sale-top">
          <div>
            <div class="sale-no">{{ saleRow.saleNo }}</div>
            <div class="sale-meta">
              {{ statusLabel(saleRow.payMethod) }}
              <template v-if="isEmpty(saleRow.username) !== true"> · {{ saleRow.username }}</template>
              · {{ formatLocalDateTime(saleRow.createdAt) }}
            </div>
          </div>
          <div class="sale-amount">{{ saleRow.amount }}</div>
        </div>
        <div v-for="itemRow in saleRow.itemList" :key="`${saleRow.saleId}-${itemRow.productId}`" class="sale-item">
          {{ itemRow.productName }} × {{ itemRow.quantity }} · {{ itemRow.salePrice }} · {{ itemRow.lineAmount }}
        </div>
        <div v-if="isEmpty(saleRow.deliveryAddress) !== true" class="sale-meta">收货地址 {{ saleRow.deliveryAddress }}</div>
        <div v-if="isEmpty(saleRow.remark) !== true" class="sale-meta">备注 {{ saleRow.remark }}</div>
      </article>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ListPager from '../../../components/ListPager/ListPager.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { PageSetting, statusLabel } from '../../../utils/constants';
import { formatLocalDateTime, isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

interface SaleItemRow {
  productId: string;
  productName: string;
  salePrice: string;
  quantity: number;
  lineAmount: string;
}

interface SaleRow {
  saleId: string;
  saleNo: string;
  username: string;
  payMethod: string;
  amount: string;
  remark: string;
  deliveryAddress: string;
  createdAt: string;
  itemList: SaleItemRow[];
}

const saleList = ref<SaleRow[]>([]);
const total = ref(0);
const page = ref(PageSetting.DEFAULT_PAGE);
const pageSize = ref(PageSetting.DEFAULT_PAGE_SIZE);

/**
 * 分页查询销售单。
 */
async function loadSales(): Promise<void> {
  const pageResult = (await http.get('/a380/store/sales', {
    params: { page: page.value, pageSize: pageSize.value },
  })) as { list: SaleRow[]; total: number };
  saleList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadSales();
}

onMounted(() => {
  void loadSales();
});
</script>

<style scoped>
.sale-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sale-card {
  padding: 14px;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #fff;
}

.sale-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.sale-no {
  font-weight: 600;
  color: #1c2434;
}

.sale-amount {
  font-size: 18px;
  font-weight: 600;
}

.sale-meta,
.sale-item {
  margin-top: 4px;
  color: #667085;
  font-size: 13px;
}

.record-empty {
  padding: 32px 0;
  text-align: center;
  color: #98a2b3;
}
</style>
