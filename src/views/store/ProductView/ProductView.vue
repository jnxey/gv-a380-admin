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
        <div class="product-cover">
          <img v-if="!isEmpty(coverImageUrl(productRow))" :src="coverImageUrl(productRow)" alt="" />
          <span v-else class="product-cover-empty">暂无图片</span>
        </div>
        <div class="product-body">
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
        </div>
      </article>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
    <el-dialog v-model="dialogVisible" :title="isEmpty(editingProductId) ? '新建商品' : '编辑商品'" width="480px">
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
import { PageSetting, PermissionCode, RecordStatus, ShopImageLimit, ShopImageMime, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { limitImageWidth, replaceUploadRawFile } from '../../../utils/image';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface ProductImageView {
  imageId: string;
  imageUrl: string;
}

interface ProductRow {
  productId: string;
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
const productList = ref<ProductRow[]>([]);
const total = ref(0);
const page = ref(PageSetting.DEFAULT_PAGE);
const pageSize = ref(PageSetting.DEFAULT_PAGE_SIZE);
const dialogVisible = ref(false);
const editingProductId = ref('');
const productImageFileList = ref<ProductImageFileItem[]>([]);
const previewVisible = ref(false);
const previewUrl = ref('');
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
 * 封面用第一张商品图片。没有图片时返回空字符串。
 */
function coverImageUrl(productRow: ProductRow): string {
  if (isEmpty(productRow.imageList)) {
    return '';
  }
  return productRow.imageList[0].imageUrl;
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
  editingProductId.value = '';
  productForm.productName = '';
  productForm.barcode = '';
  productForm.salePrice = '';
  productForm.status = RecordStatus.ENABLED;
  productImageFileList.value = [];
  dialogVisible.value = true;
}

/**
 * 打开编辑商品。
 */
function openEdit(productRow: ProductRow): void {
  editingProductId.value = productRow.productId;
  productForm.productName = productRow.productName;
  productForm.barcode = productRow.barcode;
  productForm.salePrice = productRow.salePrice;
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
  const body = {
    productName: productForm.productName,
    barcode: productForm.barcode,
    salePrice: productForm.salePrice,
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
