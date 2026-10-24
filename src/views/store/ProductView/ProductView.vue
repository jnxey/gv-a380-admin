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
    <div v-if="isEmpty(productGroupList)" class="record-empty">暂无数据</div>
    <div v-else class="product-group-list">
      <ProductCategoryBlock
        v-for="productGroup in productGroupList"
        :key="productGroup.categoryId"
        :category-id="productGroup.categoryId"
        :category-name="productGroup.categoryName"
        :product-list="productGroup.productList"
        :can-save="canSave"
        @create="openCreate(productGroup.categoryId)"
        @edit="openEdit"
        @reload="loadProducts"
      />
    </div>
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
          <ImageGalleryUpload
            ref="imageGalleryRef"
            :owner-id="editingProductId"
            :adapter="productImageAdapter"
            :enable-cover="false"
            :tip="false"
            exceed-label="商品图片"
          />
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
import { StoreApi } from '../../../api/store';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import ImageGalleryUpload, { type GalleryImageView, type ImageGalleryAdapter } from '../../../components/ImageGalleryUpload/ImageGalleryUpload.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { PageSetting, PermissionCode, RecordStatus } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import ProductCategoryBlock, { type ProductRow } from './ProductCategoryBlock.vue';

interface CategoryRow {
  categoryId: string;
  categoryName: string;
  sortOrder: number;
  status: string;
}

interface ProductGroup {
  categoryId: string;
  categoryName: string;
  productList: ProductRow[];
}

const productListPageSize = 1000;
const unknownCategoryId = '';
const unknownCategoryName = '未分类';

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.STORE_PRODUCT_SAVE);
const keyword = ref('');
const filterCategoryId = ref('');
const categoryList = ref<CategoryRow[]>([]);
const productList = ref<ProductRow[]>([]);
const dialogVisible = ref(false);
const editingProductId = ref('');
const imageGalleryRef = ref<InstanceType<typeof ImageGalleryUpload> | null>(null);
const productForm = reactive({
  categoryId: '',
  productName: '',
  barcode: '',
  salePrice: '',
  costPrice: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 商品图片的上传和删除。商品没有封面排序。
 */
const productImageAdapter: ImageGalleryAdapter = {
  async upload(ownerId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return (await http.post(StoreApi.productImages(ownerId), formData)) as GalleryImageView;
  },
  async remove(ownerId, imageId) {
    await http.delete(StoreApi.productImage(ownerId, imageId));
  },
};

/**
 * 按分类排序把商品分成多块；空分类也保留，方便在分类下新建；筛了分类时只出该块。
 */
const productGroupList = computed((): ProductGroup[] => {
  const groupList: ProductGroup[] = [];
  const usedProductIdSet = new Set<string>();
  categoryList.value.forEach((categoryRow) => {
    if (isEmpty(filterCategoryId.value) !== true && categoryRow.categoryId !== filterCategoryId.value) {
      return;
    }
    const categoryProductList = productList.value.filter((productRow) => productRow.categoryId === categoryRow.categoryId);
    categoryProductList.forEach((productRow) => {
      usedProductIdSet.add(productRow.productId);
    });
    groupList.push({
      categoryId: categoryRow.categoryId,
      categoryName: categoryRow.categoryName,
      productList: categoryProductList,
    });
  });
  if (isEmpty(filterCategoryId.value)) {
    const unknownProductList = productList.value.filter((productRow) => usedProductIdSet.has(productRow.productId) !== true);
    if (isEmpty(unknownProductList) !== true) {
      groupList.push({
        categoryId: unknownCategoryId,
        categoryName: unknownCategoryName,
        productList: unknownProductList,
      });
    }
  }
  return groupList;
});

/**
 * 查询当前门店商品分类，供筛选和下拉使用。
 */
async function loadCategories(): Promise<void> {
  categoryList.value = (await http.get(StoreApi.PRODUCT_CATEGORIES)) as CategoryRow[];
}

/**
 * 一次拉全量筛选结果，再按分类分块展示。
 */
async function loadProducts(): Promise<void> {
  const pageResult = (await http.get(StoreApi.PRODUCTS, {
    params: {
      keyword: keyword.value,
      categoryId: filterCategoryId.value,
      page: PageSetting.DEFAULT_PAGE,
      pageSize: productListPageSize,
    },
  })) as { list: ProductRow[]; total: number };
  productList.value = pageResult.list;
}

/**
 * 按关键字重新查。
 */
function searchProducts(): void {
  void loadProducts();
}

/**
 * 清空关键字和分类筛选后重新查。
 */
function resetQuery(): void {
  keyword.value = '';
  filterCategoryId.value = '';
  void loadProducts();
}

/**
 * 扫码结果写入商品条码。
 */
function onBarcodeScanned(scanText: string): void {
  productForm.barcode = scanText;
}

/**
 * 打开新建商品，并预选当前分类。
 */
async function openCreate(categoryId: string): Promise<void> {
  editingProductId.value = '';
  productForm.categoryId = categoryId;
  productForm.productName = '';
  productForm.barcode = '';
  productForm.salePrice = '';
  productForm.costPrice = '';
  productForm.status = RecordStatus.ENABLED;
  dialogVisible.value = true;
  await nextTick();
  imageGalleryRef.value?.clearImages();
}

/**
 * 打开编辑商品。
 */
async function openEdit(productRow: ProductRow): Promise<void> {
  editingProductId.value = productRow.productId;
  productForm.categoryId = productRow.categoryId;
  productForm.productName = productRow.productName;
  productForm.barcode = productRow.barcode;
  productForm.salePrice = productRow.salePrice;
  productForm.costPrice = productRow.costPrice;
  productForm.status = productRow.status;
  dialogVisible.value = true;
  await nextTick();
  imageGalleryRef.value?.setImages(isEmpty(productRow.imageList) ? [] : productRow.imageList);
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
    const createdProduct = (await http.post(StoreApi.PRODUCTS, body)) as ProductRow;
    editingProductId.value = createdProduct.productId;
    await imageGalleryRef.value?.uploadPending();
  } else {
    await http.put(StoreApi.product(editingProductId.value), body);
  }
  dialogVisible.value = false;
  await loadProducts();
}

onMounted(() => {
  void loadCategories();
  void loadProducts();
});
</script>

<style scoped>
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

.record-empty {
  padding: 32px 0;
  text-align: center;
  color: #98a2b3;
}
</style>
