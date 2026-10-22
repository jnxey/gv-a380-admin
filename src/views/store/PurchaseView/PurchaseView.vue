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
    <el-dialog v-model="dialogVisible" title="新建进货" width="720px" align-center destroy-on-close>
      <el-form class="purchase-form" label-position="top">
        <div class="draft-line-list">
          <article v-for="(lineRow, lineIndex) in draftLineList" :key="lineIndex" class="draft-line-card">
            <div class="draft-line-top">
              <div class="draft-line-title">商品 {{ lineIndex + 1 }}</div>
              <el-button
                v-if="draftLineList.length > 1"
                link
                type="danger"
                @click="removeDraftLine(lineIndex)"
              >
                删除
              </el-button>
            </div>
            <el-form-item label="商品" class="draft-line-field">
              <div class="product-pick-row">
                <el-select
                  v-model="lineRow.productId"
                  size="large"
                  filterable
                  placeholder="选择商品"
                  @change="(productId) => onPurchaseLineProductChange(lineIndex, productId)"
                >
                  <el-option
                    v-for="productRow in productOptionList"
                    :key="productRow.productId"
                    :label="`${productRow.productName}（库存 ${productRow.stockQuantity}）`"
                    :value="productRow.productId"
                  />
                </el-select>
                <ScanButton
                  type="warning"
                  size="large"
                  class="purchase-scan-button"
                  aria-label="扫码"
                  @scanned="(scanText) => onPurchaseLineScanned(lineIndex, scanText)"
                >
                  <AppIcon :icon-name="MenuIconName.SCAN_QR" />
                  <span>扫码</span>
                </ScanButton>
              </div>
            </el-form-item>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="进价" class="draft-line-field">
                  <el-input v-model="lineRow.costPrice" size="large" placeholder="进价" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="数量" class="draft-line-field">
                  <el-input v-model="lineRow.quantityText" size="large" placeholder="数量" />
                </el-form-item>
              </el-col>
            </el-row>
          </article>
        </div>
        <el-button class="draft-add-button" size="large" @click="addDraftLine">加一行</el-button>
        <el-form-item label="备注" class="draft-remark-field">
          <el-input v-model="remark" size="large" placeholder="选填" />
        </el-form-item>
        <div class="draft-total">
          <span class="draft-total-label">合计</span>
          <span class="draft-total-amount">{{ draftTotalText }}</span>
        </div>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" :loading="saving" @click="savePurchase">确认入库</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import ListPager from '../../../components/ListPager/ListPager.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { MenuIconName, PageSetting, PermissionCode } from '../../../utils/constants';
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
 * 弹窗里按进价×数量汇总，无效行按 0。
 */
const draftTotalText = computed(() => {
  let totalAmount = 0;
  for (const lineRow of draftLineList.value) {
    const costPrice = Number(lineRow.costPrice);
    const quantity = Number(lineRow.quantityText);
    if (Number.isFinite(costPrice) !== true || Number.isFinite(quantity) !== true) {
      continue;
    }
    totalAmount += costPrice * quantity;
  }
  return totalAmount.toFixed(2);
});

/**
 * 分页查询进货单。
 */
async function loadPurchases(): Promise<void> {
  const pageResult = (await http.get('/a380/store/purchases', {
    params: { page: page.value, pageSize: pageSize.value },
  })) as { list: PurchaseRow[]; total: number };
  purchaseList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 拉一批启用商品供进货选择。
 */
async function loadProductOptions(): Promise<void> {
  const pageResult = (await http.get('/a380/store/products', {
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
 * 下拉选中商品后填入该商品进价。清空商品时清空进价。
 */
function onPurchaseLineProductChange(lineIndex: number, productId: string): void {
  const draftLine = draftLineList.value[lineIndex];
  if (isEmpty(draftLine)) {
    return;
  }
  if (isEmpty(productId)) {
    draftLine.costPrice = '';
    return;
  }
  const matchedProduct = productOptionList.value.find((productRow) => {
    return productRow.productId === productId;
  });
  if (isEmpty(matchedProduct)) {
    return;
  }
  draftLine.costPrice = matchedProduct.costPrice;
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
    await http.post('/a380/store/purchases', { itemList, remark: remark.value });
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

.draft-line-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.draft-line-card {
  padding: 16px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #f9fafb;
}

.draft-line-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.draft-line-title {
  font-size: 14px;
  font-weight: 600;
  color: #1c2434;
}

.draft-line-field {
  margin-bottom: 12px;
}

.draft-line-field:last-child {
  margin-bottom: 0;
}

.product-pick-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
  width: 100%;
}

.product-pick-row :deep(.el-select),
.purchase-scan-button {
  flex: 1 1 0;
  min-width: 0;
  width: 100%;
}

.purchase-form :deep(.el-form-item__content > .el-select) {
  width: 100%;
}

.purchase-scan-button {
  height: 40px;
  margin: 0;
  border-radius: 8px;
  font-weight: 600;
}

.purchase-scan-button svg {
  width: 18px;
  height: 18px;
  margin-right: 6px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  vertical-align: -3px;
}

.draft-add-button {
  width: 100%;
  margin: 14px 0 8px;
  border-style: dashed;
  font-weight: 600;
}

.draft-remark-field {
  margin-bottom: 0;
}

.draft-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 14px 16px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #fff;
}

.draft-total-label {
  color: #667085;
  font-size: 13px;
}

.draft-total-amount {
  font-size: 22px;
  font-weight: 700;
  color: #1c2434;
}

.record-empty {
  padding: 32px 0;
  text-align: center;
  color: #98a2b3;
}
</style>
