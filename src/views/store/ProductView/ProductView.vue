<template>
  <ShopSwitcher />
  <el-card>
    <QueryBar @search="searchProducts" @reset="resetQuery">
      <el-form-item>
        <el-input v-model="keyword" v-place class="query-keyword" placeholder="商品名称/条码" clearable />
      </el-form-item>
    </QueryBar>
    <div v-if="canSave" class="product-toolbar">
      <el-button type="primary" @click="openCreate">新建商品</el-button>
    </div>
    <div v-if="isEmpty(productList)" class="record-empty">暂无数据</div>
    <div v-else class="product-list">
      <article v-for="productRow in productList" :key="productRow.productId" class="product-card">
        <div class="product-name">{{ productRow.productName }}</div>
        <div class="product-meta">条码 {{ displayText(productRow.barcode) }}</div>
        <div class="product-meta">售价 {{ productRow.salePrice }} · 进价 {{ productRow.costPrice }}</div>
        <div class="product-meta">库存 {{ productRow.stockQuantity }}</div>
        <div class="product-foot">
          <el-tag :type="productRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(productRow.status) }}
          </el-tag>
          <el-button v-if="canSave" link type="primary" @click="openEdit(productRow)">编辑</el-button>
        </div>
      </article>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="dialogVisible" :title="isEmpty(editingProduct) ? '新建商品' : '编辑商品'" width="480px">
      <el-form label-position="top">
        <el-form-item label="名称"><el-input v-model="productForm.productName" /></el-form-item>
        <el-form-item label="条码">
          <div class="barcode-row">
            <el-input v-model="productForm.barcode" />
            <ScanButton @scanned="onBarcodeScanned" />
          </div>
        </el-form-item>
        <el-form-item label="售价"><el-input v-model="productForm.salePrice" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="productForm.status">
            <el-option label="启用" :value="RecordStatus.ENABLED" />
            <el-option label="停用" :value="RecordStatus.DISABLED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import ListPager from '../../../components/ListPager/ListPager.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { PageSetting, PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface ProductRow {
  productId: string;
  productName: string;
  barcode: string;
  salePrice: string;
  costPrice: string;
  stockQuantity: number;
  status: string;
}

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.STORE_PRODUCT_SAVE);
const keyword = ref('');
const productList = ref<ProductRow[]>([]);
const total = ref(0);
const page = ref(PageSetting.DEFAULT_PAGE);
const pageSize = ref(PageSetting.DEFAULT_PAGE_SIZE);
const dialogVisible = ref(false);
const editingProduct = ref<ProductRow | null>(null);
const productForm = reactive({
  productName: '',
  barcode: '',
  salePrice: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 空文本显示成横线。
 */
function displayText(text: string): string {
  if (isEmpty(text)) {
    return '—';
  }
  return text;
}

/**
 * 分页查询商品。
 */
async function loadProducts(): Promise<void> {
  const pageResult = (await http.get('/admin/store/products', {
    params: {
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value,
    },
  })) as { list: ProductRow[]; total: number };
  productList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 按关键字从第一页查。
 */
function searchProducts(): void {
  page.value = PageSetting.DEFAULT_PAGE;
  void loadProducts();
}

/**
 * 清空关键字后重新查。
 */
function resetQuery(): void {
  keyword.value = '';
  page.value = PageSetting.DEFAULT_PAGE;
  void loadProducts();
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadProducts();
}

/**
 * 扫码结果写入商品条码。
 */
function onBarcodeScanned(scanText: string): void {
  productForm.barcode = scanText;
}

/**
 * 打开新建商品。
 */
function openCreate(): void {
  editingProduct.value = null;
  productForm.productName = '';
  productForm.barcode = '';
  productForm.salePrice = '';
  productForm.status = RecordStatus.ENABLED;
  dialogVisible.value = true;
}

/**
 * 打开编辑商品。
 */
function openEdit(productRow: ProductRow): void {
  editingProduct.value = productRow;
  productForm.productName = productRow.productName;
  productForm.barcode = productRow.barcode;
  productForm.salePrice = productRow.salePrice;
  productForm.status = productRow.status;
  dialogVisible.value = true;
}

/**
 * 保存商品。新建走 POST，编辑走 PUT。
 */
async function saveProduct(): Promise<void> {
  const body = {
    productName: productForm.productName,
    barcode: productForm.barcode,
    salePrice: productForm.salePrice,
    status: productForm.status,
  };
  if (isEmpty(editingProduct.value)) {
    await http.post('/admin/store/products', body);
  } else {
    await http.put(`/admin/store/products/${editingProduct.value.productId}`, body);
  }
  dialogVisible.value = false;
  await loadProducts();
}

onMounted(() => {
  void loadProducts();
});
</script>

<style scoped>
.product-toolbar {
  margin-bottom: 12px;
}

.barcode-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.barcode-row :deep(.el-input) {
  flex: 1 1 auto;
  min-width: 0;
}

.product-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.product-card {
  padding: 14px;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #fff;
}

.product-name {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1c2434;
}

.product-meta {
  margin-top: 4px;
  color: #667085;
  font-size: 13px;
}

.product-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.record-empty {
  padding: 32px 0;
  text-align: center;
  color: #98a2b3;
}
</style>
