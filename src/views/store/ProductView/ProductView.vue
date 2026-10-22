<template>
  <ShopSwitcher />
  <el-card>
    <QueryBar @search="searchProducts" @reset="resetQuery">
      <el-form-item>
        <el-input v-model="keyword" v-place class="query-keyword" placeholder="商品名称/条码" clearable />
      </el-form-item>
      <el-form-item>
        <el-select v-model="filterCategoryId" clearable placeholder="全部分类" style="width: 160px">
          <el-option v-for="categoryRow in categoryList" :key="categoryRow.categoryId" :label="categoryRow.categoryName" :value="categoryRow.categoryId" />
        </el-select>
      </el-form-item>
    </QueryBar>
    <div v-if="canSave" class="product-toolbar">
      <el-button type="primary" @click="openCreate">新建商品</el-button>
    </div>
    <div v-if="isEmpty(productList)" class="record-empty">暂无数据</div>
    <div v-else ref="sortListRef" class="product-list">
      <article v-for="productRow in productList" :key="productRow.productId" class="product-card">
        <div class="product-cover">
          <img v-if="!isEmpty(coverImageUrl(productRow))" :src="coverImageUrl(productRow)" alt="" />
          <span v-else class="product-cover-empty">暂无图片</span>
        </div>
        <div class="product-body">
          <div class="product-name name-box" :data-key="productRow.productId">
            <button v-if="canSave" type="button" class="drag-icon">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  fill="currentColor"
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M5.33333 5.33335C6.06971 5.33335 6.66667 4.7364 6.66667 4.00002C6.66667 3.26364 6.06971 2.66669 5.33333 2.66669C4.59695 2.66669 4 3.26364 4 4.00002C4 4.7364 4.59695 5.33335 5.33333 5.33335ZM10.6667 5.33335C11.403 5.33335 12 4.7364 12 4.00002C12 3.26364 11.403 2.66669 10.6667 2.66669C9.93029 2.66669 9.33333 3.26364 9.33333 4.00002C9.33333 4.7364 9.93029 5.33335 10.6667 5.33335ZM6.66667 8.00002C6.66667 8.7364 6.06971 9.33335 5.33333 9.33335C4.59695 9.33335 4 8.7364 4 8.00002C4 7.26364 4.59695 6.66669 5.33333 6.66669C6.06971 6.66669 6.66667 7.26364 6.66667 8.00002ZM10.6667 9.33335C11.403 9.33335 12 8.7364 12 8.00002C12 7.26364 11.403 6.66669 10.6667 6.66669C9.93029 6.66669 9.33333 7.26364 9.33333 8.00002C9.33333 8.7364 9.93029 9.33335 10.6667 9.33335ZM6.66667 12C6.66667 12.7364 6.06971 13.3334 5.33333 13.3334C4.59695 13.3334 4 12.7364 4 12C4 11.2636 4.59695 10.6667 5.33333 10.6667C6.06971 10.6667 6.66667 11.2636 6.66667 12ZM10.6667 13.3334C11.403 13.3334 12 12.7364 12 12C12 11.2636 11.403 10.6667 10.6667 10.6667C9.93029 10.6667 9.33333 11.2636 9.33333 12C9.33333 12.7364 9.93029 13.3334 10.6667 13.3334Z"
                />
              </svg>
            </button>
            <span>{{ productRow.productName }}</span>
          </div>
          <div class="product-meta">分类 {{ displayText(productRow.categoryName) }}</div>
          <div class="product-meta">条码 {{ displayText(productRow.barcode) }}</div>
          <div class="product-meta">售价 {{ productRow.salePrice }} · 进价 {{ productRow.costPrice }}</div>
          <div class="product-meta">库存 {{ productRow.stockQuantity }}</div>
          <div class="product-foot">
            <el-tag :type="productRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
              {{ statusLabel(productRow.status) }}
            </el-tag>
            <el-button v-if="canSave" link type="primary" @click="openEdit(productRow)">编辑</el-button>
          </div>
        </div>
      </article>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="dialogVisible" :title="isEmpty(editingProductId) ? '新建商品' : '编辑商品'" width="480px">
      <el-form label-position="top">
        <el-form-item label="分类" required>
          <el-select v-model="productForm.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="categoryRow in categoryList" :key="categoryRow.categoryId" :label="categoryRow.categoryName" :value="categoryRow.categoryId" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称"><el-input v-model="productForm.productName" /></el-form-item>
        <el-form-item label="条码" required>
          <div class="barcode-row">
            <el-input v-model="productForm.barcode" placeholder="必填，同门店唯一" />
            <ScanButton @scanned="onBarcodeScanned" />
          </div>
        </el-form-item>
        <el-form-item label="售价"><el-input v-model="productForm.salePrice" /></el-form-item>
        <el-form-item label="进价"><el-input v-model="productForm.costPrice" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="productForm.status">
            <el-option label="启用" :value="RecordStatus.ENABLED" />
            <el-option label="停用" :value="RecordStatus.DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            v-model:file-list="productImageFileList"
            :class="{ 'product-image-full': productImageFileList.length >= ShopImageLimit.MAX_COUNT }"
            list-type="picture-card"
            :limit="ShopImageLimit.MAX_COUNT"
            :accept="productImageAccept"
            :http-request="uploadProductImage"
            :before-upload="beforeUploadProductImage"
            :on-remove="removeProductImage"
            :on-preview="previewProductImage"
            :on-exceed="onProductImageExceed"
          >
            <span class="product-image-add">+</span>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="previewVisible" title="图片预览" width="480px">
      <img class="product-image-preview" :src="previewUrl" alt="" />
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { UploadRequestOptions, UploadUserFile } from 'element-plus';
import ListPager from '../../../components/ListPager/ListPager.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { useDragSort } from '../../../hooks/drag-sort';
import { PageSetting, PermissionCode, RecordStatus, ShopImageLimit, ShopImageMime, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { limitImageWidth, replaceUploadRawFile } from '../../../utils/image';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface ProductImageView {
  imageId: string;
  imageUrl: string;
}

interface CategoryRow {
  categoryId: string;
  categoryName: string;
  sortOrder: number;
  status: string;
}

interface ProductRow {
  productId: string;
  categoryId: string;
  categoryName: string;
  productName: string;
  barcode: string;
  salePrice: string;
  costPrice: string;
  stockQuantity: number;
  status: string;
  imageList: ProductImageView[];
}

interface ProductImageFileItem extends UploadUserFile {
  imageId?: string;
}

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.STORE_PRODUCT_SAVE);
const productImageAccept = `${ShopImageMime.JPEG},${ShopImageMime.PNG},${ShopImageMime.WEBP}`;
const keyword = ref('');
const filterCategoryId = ref('');
const categoryList = ref<CategoryRow[]>([]);
const productList = ref<ProductRow[]>([]);
const sortListRef = ref<HTMLElement | null>(null);
const total = ref(0);
const page = ref(PageSetting.DEFAULT_PAGE);
const pageSize = ref(PageSetting.DEFAULT_PAGE_SIZE);
const dialogVisible = ref(false);
const editingProductId = ref('');
const productImageFileList = ref<ProductImageFileItem[]>([]);
const previewVisible = ref(false);
const previewUrl = ref('');
const productForm = reactive({
  categoryId: '',
  productName: '',
  barcode: '',
  salePrice: '',
  costPrice: '',
  status: RecordStatus.ENABLED as string,
});
const { initDragSort } = useDragSort(
  () => sortListRef.value,
  () => canSave === true,
  saveProductSort,
);

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
 * 封面用第一张商品图片。没有图片时返回空字符串。
 */
function coverImageUrl(productRow: ProductRow): string {
  if (isEmpty(productRow.imageList)) {
    return '';
  }
  return productRow.imageList[0].imageUrl;
}

/**
 * 查询当前门店商品分类，供筛选和下拉使用。
 */
async function loadCategories(): Promise<void> {
  categoryList.value = (await http.get('/admin/store/product-categories')) as CategoryRow[];
}

/**
 * 分页查询商品。
 */
async function loadProducts(): Promise<void> {
  const pageResult = (await http.get('/admin/store/products', {
    params: {
      keyword: keyword.value,
      categoryId: filterCategoryId.value,
      page: page.value,
      pageSize: pageSize.value,
    },
  })) as { list: ProductRow[]; total: number };
  productList.value = pageResult.list;
  total.value = pageResult.total;
  await initDragSort();
}

/**
 * 按拖动后的编号顺序保存商品。失败时重新查询。
 */
async function saveProductSort(idList: string[]): Promise<void> {
  productList.value = idList.flatMap((recordId) => {
    const productRow = productList.value.find((item) => item.productId === recordId);
    if (isEmpty(productRow)) {
      return [];
    }
    return [productRow];
  });
  try {
    await http.put('/admin/store/products/sort', { idList });
  } catch (error) {
    void error;
    await loadProducts();
  }
}

/**
 * 按关键字从第一页查。
 */
function searchProducts(): void {
  page.value = PageSetting.DEFAULT_PAGE;
  void loadProducts();
}

/**
 * 清空关键字和分类筛选后重新查。
 */
function resetQuery(): void {
  keyword.value = '';
  filterCategoryId.value = '';
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
  editingProductId.value = '';
  productForm.categoryId = '';
  productForm.productName = '';
  productForm.barcode = '';
  productForm.salePrice = '';
  productForm.costPrice = '';
  productForm.status = RecordStatus.ENABLED;
  productImageFileList.value = [];
  dialogVisible.value = true;
}

/**
 * 打开编辑商品。
 */
function openEdit(productRow: ProductRow): void {
  editingProductId.value = productRow.productId;
  productForm.categoryId = productRow.categoryId;
  productForm.productName = productRow.productName;
  productForm.barcode = productRow.barcode;
  productForm.salePrice = productRow.salePrice;
  productForm.costPrice = productRow.costPrice;
  productForm.status = productRow.status;
  const imageList = isEmpty(productRow.imageList) ? [] : productRow.imageList;
  productImageFileList.value = imageList.map((productImage) => {
    return {
      name: productImage.imageId,
      url: productImage.imageUrl,
      imageId: productImage.imageId,
    };
  });
  dialogVisible.value = true;
}

/**
 * 保存商品。新建成功后再补传选中的图片。
 */
async function saveProduct(): Promise<void> {
  if (isEmpty(productForm.categoryId)) {
    ElMessage.error('请选择商品分类');
    return;
  }
  if (isEmpty(productForm.barcode) || isEmpty(productForm.barcode.trim())) {
    ElMessage.error('请填写条码');
    return;
  }
  const body = {
    categoryId: productForm.categoryId,
    productName: productForm.productName,
    barcode: productForm.barcode,
    salePrice: productForm.salePrice,
    costPrice: productForm.costPrice,
    status: productForm.status,
  };
  if (isEmpty(editingProductId.value)) {
    const createdProduct = (await http.post('/admin/store/products', body)) as ProductRow;
    editingProductId.value = createdProduct.productId;
    await uploadPendingProductImages(createdProduct.productId);
  } else {
    await http.put(`/admin/store/products/${editingProductId.value}`, body);
  }
  dialogVisible.value = false;
  await loadProducts();
}

/**
 * 只允许 jpg、png、webp，且不超过大小上限。通过后把过宽的图缩小。
 */
async function beforeUploadProductImage(file: File): Promise<boolean | File> {
  const mimeAllowed = file.type === ShopImageMime.JPEG || file.type === ShopImageMime.PNG || file.type === ShopImageMime.WEBP;
  if (mimeAllowed !== true) {
    ElMessage.error('只支持 jpg、png、webp');
    return false;
  }
  if (file.size > ShopImageLimit.MAX_BYTES) {
    ElMessage.error('图片不能超过5MB');
    return false;
  }
  return limitImageWidth(file);
}

/**
 * 已满 6 张时提示，不再加入列表。
 */
function onProductImageExceed(): void {
  ElMessage.warning(`商品图片最多${ShopImageLimit.MAX_COUNT}张`);
}

/**
 * 编辑时立即上传。新建时只留在列表里，等商品保存成功后再传。
 */
async function uploadProductImage(options: UploadRequestOptions): Promise<void> {
  replaceUploadRawFile(productImageFileList.value, options.file);
  if (isEmpty(editingProductId.value)) {
    options.onSuccess({});
    return;
  }
  try {
    const imageView = await postProductImage(editingProductId.value, options.file);
    const currentFile = productImageFileList.value.find((fileItem) => fileItem.uid === options.file.uid);
    if (!isEmpty(currentFile)) {
      currentFile.imageId = imageView.imageId;
      currentFile.url = imageView.imageUrl;
    }
    options.onSuccess(imageView);
  } catch (error) {
    options.onError(new Error('上传失败') as Parameters<UploadRequestOptions['onError']>[0]);
    void error;
  }
}

/**
 * 删除已保存的图片。还没上传的只从列表移除。
 */
async function removeProductImage(fileItem: ProductImageFileItem): Promise<void> {
  if (isEmpty(fileItem.imageId) || isEmpty(editingProductId.value)) {
    return;
  }
  await http.delete(`/admin/store/products/${editingProductId.value}/images/${fileItem.imageId}`);
}

/**
 * 预览一张商品图片。
 */
function previewProductImage(fileItem: ProductImageFileItem): void {
  previewUrl.value = isEmpty(fileItem.url) ? '' : fileItem.url;
  previewVisible.value = true;
}

/**
 * 把一张图片传到指定商品。
 */
async function postProductImage(productId: string, file: File): Promise<ProductImageView> {
  const formData = new FormData();
  formData.append('file', file);
  return (await http.post(`/admin/store/products/${productId}/images`, formData)) as ProductImageView;
}

/**
 * 把商品保存前选中、尚未上传的图片补传上去。
 */
async function uploadPendingProductImages(productId: string): Promise<void> {
  const pendingFileList = productImageFileList.value.filter((fileItem) => isEmpty(fileItem.imageId) && !isEmpty(fileItem.raw));
  for (const fileItem of pendingFileList) {
    if (isEmpty(fileItem.raw)) {
      continue;
    }
    const imageView = await postProductImage(productId, fileItem.raw);
    fileItem.imageId = imageView.imageId;
    fileItem.url = imageView.imageUrl;
  }
}

onMounted(() => {
  void loadCategories();
  void loadProducts();
});
</script>

<style scoped>
.product-toolbar {
  margin-bottom: 12px;
}

.barcode-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
  width: 100%;
}

.barcode-row :deep(.el-input),
.barcode-row :deep(.el-button) {
  flex: 1 1 0;
  min-width: 0;
  width: 100%;
}

.product-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.product-card {
  overflow: hidden;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #fff;
}

.product-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  background: #f4f6f8;
}

.product-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-cover-empty {
  font-size: 13px;
  color: #909399;
}

.product-body {
  padding: 14px;
}

.product-name {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1c2434;
  word-break: break-word;
}

.drag-icon {
  display: inline-flex;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  padding: 0;
  color: #98a2b3;
  cursor: move;
  background: transparent;
  border: none;
}

.drag-icon svg {
  width: 16px;
  height: 16px;
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

.product-image-add {
  font-size: 28px;
  line-height: 1;
  color: #909399;
}

.product-image-full :deep(.el-upload--picture-card) {
  display: none;
}

.product-image-preview {
  display: block;
  width: 100%;
}

.record-empty {
  padding: 32px 0;
  text-align: center;
  color: #98a2b3;
}
</style>
