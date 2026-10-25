<template>
  <ShopSwitcher />
  <el-card>
    <QueryBar @search="searchProducts" @reset="resetQuery">
      <el-form-item>
        <el-input v-model="keyword" v-place class="query-keyword" placeholder="条码/名称" clearable />
      </el-form-item>
      <template #append>
        <el-form-item>
          <ScanButton type="warning" @scanned="onBarcodeScanned">扫条码</ScanButton>
        </el-form-item>
      </template>
    </QueryBar>
    <div class="product-toolbar">
      <el-button v-if="canSave" type="primary" :disabled="isEmpty(filterCategoryId)" @click="openCreate">新建商品</el-button>
      <el-radio-group v-model="filterCategoryId" class="product-category-radio" @change="onCategoryChange">
        <el-radio-button v-for="categoryRow in categoryList" :key="categoryRow.categoryId" :value="categoryRow.categoryId">
          {{ categoryRow.categoryName }}
        </el-radio-button>
      </el-radio-group>
    </div>
    <div ref="sortListRef" class="record-list record-list--wide-table">
      <RecordTableHead />
      <div v-if="isEmpty(filterCategoryId)" class="record-empty">请先创建商品分类</div>
      <div v-else-if="isEmpty(productList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="productRow in productList" :key="productRow.productId">
        <RecordField label="名称">
          <span class="name-box" :data-key="productRow.productId">
            <button v-if="canDragSort" type="button" class="drag-icon">
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
          </span>
        </RecordField>
        <RecordField label="分类">{{ productRow.categoryName }}</RecordField>
        <RecordField label="图片">
          <img v-if="!isEmpty(coverImageUrl(productRow))" class="product-thumb" :src="coverImageUrl(productRow)" alt="" />
          <template v-else>{{ displayText('') }}</template>
        </RecordField>
        <RecordField label="条码">{{ displayText(productRow.barcode) }}</RecordField>
        <RecordField label="售价">{{ productRow.salePrice }}</RecordField>
        <RecordField label="进价">{{ productRow.costPrice }}</RecordField>
        <RecordField label="库存">{{ productRow.stockQuantity }}</RecordField>
        <RecordField label="状态">
          <el-tag :type="productRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(productRow.status) }}
          </el-tag>
        </RecordField>
        <template v-if="canSave" #actions>
          <el-button link type="primary" @click="openEdit(productRow)">编辑</el-button>
        </template>
      </RecordCard>
    </div>
    <ProductDialog
      v-model="dialogVisible"
      :product="editingProduct"
      :category-list="categoryList"
      :default-category-id="filterCategoryId"
      @saved="loadProducts"
    />
  </el-card>
</template>

<script setup lang="ts">
import { StoreApi } from '../../../api/store';
import { computed, onMounted, ref } from 'vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import RecordTableHead from '../../../components/RecordTableHead/RecordTableHead.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { useDragSort } from '../../../hooks/drag-sort';
import { PageSetting, PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import ProductDialog, { type ProductCategoryOption, type ProductRow } from './ProductDialog.vue';

const productListPageSize = 1000;

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.STORE_PRODUCT_SAVE);
const keyword = ref('');
const filterCategoryId = ref('');
const appliedKeyword = ref('');
const categoryList = ref<ProductCategoryOption[]>([]);
const productList = ref<ProductRow[]>([]);
const sortListRef = ref<HTMLElement | null>(null);
const dialogVisible = ref(false);
const editingProduct = ref<ProductRow | null>(null);

/**
 * 有关键字筛选时不能拖排序，否则提交的编号列表不完整。分类始终按当前选中项加载。
 */
const canDragSort = computed(() => {
  return canSave === true && isEmpty(appliedKeyword.value) && isEmpty(filterCategoryId.value) !== true;
});

const { initDragSort } = useDragSort(
  () => sortListRef.value,
  () => canDragSort.value === true,
  saveProductSort
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
 * 列表缩略图取第一张商品图片。没有图片时返回空字符串。
 */
function coverImageUrl(productRow: ProductRow): string {
  if (isEmpty(productRow.imageList)) {
    return '';
  }
  return productRow.imageList[0].imageUrl;
}

/**
 * 查询当前门店商品分类；默认选中第一项。
 */
async function loadCategories(): Promise<void> {
  categoryList.value = (await http.get(StoreApi.PRODUCT_CATEGORIES)) as ProductCategoryOption[];
  if (isEmpty(categoryList.value)) {
    filterCategoryId.value = '';
    return;
  }
  const matchedCategory = categoryList.value.find((categoryRow) => categoryRow.categoryId === filterCategoryId.value);
  if (isEmpty(matchedCategory)) {
    filterCategoryId.value = categoryList.value[0].categoryId;
  }
}

/**
 * 按当前分类和已应用的关键字查询商品。
 */
async function loadProducts(): Promise<void> {
  if (isEmpty(filterCategoryId.value)) {
    productList.value = [];
    return;
  }
  const pageResult = (await http.get(StoreApi.PRODUCTS, {
    params: {
      keyword: appliedKeyword.value,
      categoryId: filterCategoryId.value,
      page: PageSetting.DEFAULT_PAGE,
      pageSize: productListPageSize
    }
  })) as { list: ProductRow[]; total: number };
  productList.value = pageResult.list;
  await initDragSort();
}

/**
 * 切换分类后重新查当前分类商品。
 */
function onCategoryChange(): void {
  void loadProducts();
}

/**
 * 应用条码/名称筛选后重新查。
 */
function searchProducts(): void {
  appliedKeyword.value = keyword.value.trim();
  void loadProducts();
}

/**
 * 扫码结果写入关键字并立即查询。
 */
function onBarcodeScanned(scanText: string): void {
  keyword.value = scanText;
  searchProducts();
}

/**
 * 清空关键字后重新查；分类保持必选，不重置。
 */
function resetQuery(): void {
  keyword.value = '';
  appliedKeyword.value = '';
  void loadProducts();
}

/**
 * 打开新建商品。
 */
function openCreate(): void {
  editingProduct.value = null;
  dialogVisible.value = true;
}

/**
 * 打开编辑商品。
 */
function openEdit(productRow: ProductRow): void {
  editingProduct.value = productRow;
  dialogVisible.value = true;
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
    await http.put(StoreApi.PRODUCTS_SORT, { idList });
  } catch (error) {
    void error;
    await loadProducts();
  }
}

onMounted(async () => {
  await loadCategories();
  await loadProducts();
});
</script>

<style scoped>
.product-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.product-category-radio {
  flex: 1 1 auto;
  min-width: 0;
}

.record-list {
  margin-top: 16px;
}

.name-box {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}

.product-thumb {
  display: block;
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
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

.record-empty {
  padding: 32px 0;
  text-align: center;
  color: #98a2b3;
}
</style>
