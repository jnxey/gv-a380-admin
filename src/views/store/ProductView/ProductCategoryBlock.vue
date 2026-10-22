<template>
  <section class="product-category-block">
    <h3 class="product-category-title">{{ categoryName }}</h3>
    <div ref="sortListRef" class="product-list">
      <button
        v-if="canSave && isEmpty(categoryId) !== true"
        type="button"
        class="product-card room-type-create"
        @click="emit('create')"
      >
        <span class="room-type-create-plus">+</span>
        <span>新建商品</span>
      </button>
      <article v-for="productRow in localProductList" :key="productRow.productId" class="product-card">
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
          <div class="product-meta">条码 {{ displayText(productRow.barcode) }}</div>
          <div class="product-meta">售价 {{ productRow.salePrice }} · 进价 {{ productRow.costPrice }}</div>
          <div class="product-meta">库存 {{ productRow.stockQuantity }}</div>
          <div class="product-foot">
            <el-tag :type="productRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
              {{ statusLabel(productRow.status) }}
            </el-tag>
            <el-button v-if="canSave" link type="primary" @click="emit('edit', productRow)">编辑</el-button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { StoreApi } from '../../../api/store';
import { onMounted, ref, watch } from 'vue';
import { useDragSort } from '../../../hooks/drag-sort';
import { RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

export interface ProductImageView {
  imageId: string;
  imageUrl: string;
}

export interface ProductRow {
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

const props = defineProps<{
  categoryId: string;
  categoryName: string;
  productList: ProductRow[];
  canSave: boolean;
}>();

const emit = defineEmits<{
  create: [];
  edit: [productRow: ProductRow];
  reload: [];
}>();

const localProductList = ref<ProductRow[]>([]);
const sortListRef = ref<HTMLElement | null>(null);
const { initDragSort } = useDragSort(
  () => sortListRef.value,
  () => props.canSave === true,
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
 * 把父组件传来的商品同步到本块，并重新绑定拖动。
 */
async function syncProductList(productList: ProductRow[]): Promise<void> {
  localProductList.value = productList.slice();
  await initDragSort();
}

/**
 * 按拖动后的编号顺序保存本块商品。失败时通知父组件重新查询。
 */
async function saveProductSort(idList: string[]): Promise<void> {
  localProductList.value = idList.flatMap((recordId) => {
    const productRow = localProductList.value.find((item) => item.productId === recordId);
    if (isEmpty(productRow)) {
      return [];
    }
    return [productRow];
  });
  try {
    await http.put(StoreApi.PRODUCTS_SORT, { idList });
  } catch (error) {
    void error;
    emit('reload');
  }
}

watch(
  () => props.productList,
  (productList) => {
    void syncProductList(productList);
  },
);

onMounted(() => {
  void syncProductList(props.productList);
});
</script>

<style scoped>
.product-category-block + .product-category-block {
  margin-top: 24px;
}

.product-category-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #1c2434;
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

.room-type-create {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 180px;
  padding: 0;
  font: inherit;
  font-size: 14px;
  color: #667085;
  cursor: pointer;
  background: #ffffff;
  border: 1px dashed #c8cdd4;
}

.room-type-create-plus {
  font-size: 28px;
  line-height: 1;
  color: #98a2b3;
}

.product-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
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
  padding: 10px 12px 12px;
}

.product-name {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 15px;
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
  margin-top: 2px;
  color: #667085;
  font-size: 12px;
}

.product-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
</style>
