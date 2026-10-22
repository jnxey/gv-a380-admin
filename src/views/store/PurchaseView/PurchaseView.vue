<template>
  <ShopSwitcher />
  <el-card>
    <div class="purchase-toolbar">
      <el-button v-if="canSave" type="primary" @click="openCreate">新建进货</el-button>
    </div>
    <div v-if="isEmpty(purchaseList)" class="record-empty">暂无数据</div>
    <div v-else class="purchase-list">
      <article v-for="purchaseRow in purchaseList" :key="purchaseRow.purchaseId" class="purchase-card">
        <div class="purchase-top">
          <div>
            <div class="purchase-no">{{ purchaseRow.purchaseNo }}</div>
            <div class="purchase-meta">{{ formatLocalDateTime(purchaseRow.createdAt) }}</div>
          </div>
          <div class="purchase-amount">{{ purchaseRow.amount }}</div>
        </div>
        <div v-for="itemRow in purchaseRow.itemList" :key="`${purchaseRow.purchaseId}-${itemRow.productId}`" class="purchase-item">
          {{ itemRow.productName }} × {{ itemRow.quantity }} · 进价 {{ itemRow.costPrice }} · {{ itemRow.lineAmount }}
        </div>
        <div v-if="isEmpty(purchaseRow.remark) !== true" class="purchase-meta">备注 {{ purchaseRow.remark }}</div>
      </article>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="dialogVisible" title="新建进货" width="640px">
      <el-form label-position="top">
        <div v-for="(lineRow, lineIndex) in draftLineList" :key="lineIndex" class="draft-line">
          <el-form-item label="商品">
            <div class="product-pick-row">
              <el-select v-model="lineRow.productId" filterable placeholder="选择商品">
                <el-option
                  v-for="productRow in productOptionList"
                  :key="productRow.productId"
                  :label="`${productRow.productName}（库存 ${productRow.stockQuantity}）`"
                  :value="productRow.productId"
                />
              </el-select>
              <ScanButton @scanned="(scanText) => onPurchaseLineScanned(lineIndex, scanText)" />
            </div>
          </el-form-item>
          <el-form-item label="进价"><el-input v-model="lineRow.costPrice" /></el-form-item>
          <el-form-item label="数量"><el-input v-model="lineRow.quantityText" /></el-form-item>
          <el-button link type="danger" @click="removeDraftLine(lineIndex)">删除</el-button>
        </div>
        <el-button @click="addDraftLine">加一行</el-button>
        <el-form-item label="备注"><el-input v-model="remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="savePurchase">确认入库</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { PageSetting, PermissionCode } from '../../../utils/constants';
import { formatLocalDateTime, isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface ProductRow {
  productId: string;
  productName: string;
  barcode: string;
  stockQuantity: number;
  costPrice: string;
}

interface PurchaseItemRow {
  productId: string;
  productName: string;
  costPrice: string;
  quantity: number;
  lineAmount: string;
}

interface PurchaseRow {
  purchaseId: string;
  purchaseNo: string;
  amount: string;
  remark: string;
  createdAt: string;
  itemList: PurchaseItemRow[];
}

interface DraftLine {
  productId: string;
  costPrice: string;
  quantityText: string;
}

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.STORE_PURCHASE_SAVE);
const purchaseList = ref<PurchaseRow[]>([]);
const productOptionList = ref<ProductRow[]>([]);
const total = ref(0);
const page = ref(PageSetting.DEFAULT_PAGE);
const pageSize = ref(PageSetting.DEFAULT_PAGE_SIZE);
const dialogVisible = ref(false);
const saving = ref(false);
const remark = ref('');
const draftLineList = ref<DraftLine[]>([{ productId: '', costPrice: '', quantityText: '1' }]);

/**
 * 分页查询进货单。
 */
async function loadPurchases(): Promise<void> {
  const pageResult = (await http.get('/admin/store/purchases', {
    params: { page: page.value, pageSize: pageSize.value },
  })) as { list: PurchaseRow[]; total: number };
  purchaseList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 拉一批启用商品供进货选择。
 */
async function loadProductOptions(): Promise<void> {
  const pageResult = (await http.get('/admin/store/products', {
    params: { page: PageSetting.DEFAULT_PAGE, pageSize: 100 },
  })) as { list: ProductRow[] };
  productOptionList.value = pageResult.list;
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadPurchases();
}

/**
 * 打开新建进货。
 */
async function openCreate(): Promise<void> {
  remark.value = '';
  draftLineList.value = [{ productId: '', costPrice: '', quantityText: '1' }];
  await loadProductOptions();
  dialogVisible.value = true;
}

/**
 * 再加一行进货商品。
 */
function addDraftLine(): void {
  draftLineList.value.push({ productId: '', costPrice: '', quantityText: '1' });
}

/**
 * 扫码按条码全等选中该行商品，并填进价。
 */
function onPurchaseLineScanned(lineIndex: number, scanText: string): void {
  const matchedProduct = productOptionList.value.find((productRow) => {
    return productRow.barcode === scanText;
  });
  if (isEmpty(matchedProduct)) {
    ElMessage.warning('未找到商品');
    return;
  }
  const draftLine = draftLineList.value[lineIndex];
  if (isEmpty(draftLine)) {
    return;
  }
  draftLine.productId = matchedProduct.productId;
  draftLine.costPrice = matchedProduct.costPrice;
}

/**
 * 删掉一行进货商品。
 */
function removeDraftLine(lineIndex: number): void {
  if (draftLineList.value.length <= 1) {
    return;
  }
  draftLineList.value.splice(lineIndex, 1);
}

/**
 * 确认进货入库。
 */
async function savePurchase(): Promise<void> {
  const itemList = draftLineList.value.map((lineRow) => {
    return {
      productId: lineRow.productId,
      costPrice: lineRow.costPrice,
      quantity: Number(lineRow.quantityText),
    };
  });
  for (const itemRow of itemList) {
    if (isEmpty(itemRow.productId) || Number.isInteger(itemRow.quantity) !== true || itemRow.quantity < 1) {
      ElMessage.warning('请完整填写进货商品和数量');
      return;
    }
  }
  saving.value = true;
  try {
    await http.post('/admin/store/purchases', { itemList, remark: remark.value });
    dialogVisible.value = false;
    page.value = PageSetting.DEFAULT_PAGE;
    await loadPurchases();
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadPurchases();
});
</script>

<style scoped>
.purchase-toolbar {
  margin-bottom: 12px;
}

.purchase-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.purchase-card {
  padding: 14px;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #fff;
}

.purchase-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.purchase-no {
  font-weight: 600;
  color: #1c2434;
}

.purchase-amount {
  font-size: 18px;
  font-weight: 600;
  color: #1c2434;
}

.purchase-meta,
.purchase-item {
  margin-top: 4px;
  color: #667085;
  font-size: 13px;
}

.draft-line {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 8px;
  align-items: end;
  margin-bottom: 8px;
}

.product-pick-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.product-pick-row :deep(.el-select) {
  flex: 1 1 auto;
  min-width: 0;
}

.record-empty {
  padding: 32px 0;
  text-align: center;
  color: #98a2b3;
}
</style>
