<template>
  <el-dialog v-model="visible" :title="isEmpty(product) ? '新建商品' : '编辑商品'" width="720px">
    <el-form label-position="top">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="分类" required>
            <el-select v-model="productForm.categoryId" placeholder="请选择分类" style="width: 100%">
              <el-option
                v-for="categoryRow in selectableCategoryList"
                :key="categoryRow.categoryId"
                :label="categoryRow.categoryName"
                :value="categoryRow.categoryId"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="名称"><el-input v-model="productForm.productName" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="条码" required>
            <div class="barcode-row">
              <el-input v-model="productForm.barcode" placeholder="必填，同门店唯一" />
              <ScanButton @scanned="onBarcodeScanned" />
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="售价"><el-input v-model="productForm.salePrice" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="进价"><el-input v-model="productForm.costPrice" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="快捷商品">
            <el-radio-group v-model="productForm.quickProduct">
              <el-radio :value="true">是</el-radio>
              <el-radio :value="false">否</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态">
            <el-radio-group v-model="productForm.status">
              <el-radio :value="RecordStatus.ENABLED">启用</el-radio>
              <el-radio :value="RecordStatus.DISABLED">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="详细描述">
            <el-input
              v-model="productForm.description.content"
              type="textarea"
              :rows="3"
              :maxlength="DetailDescriptionLimit.MAX_LENGTH"
              show-word-limit
              placeholder="选填"
            />
          </el-form-item>
        </el-col>
        <el-col :span="24">
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
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button size="large" :disabled="saving" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" :loading="saving" @click="saveProduct">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { StoreApi } from '../../../api/store';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import ImageGalleryUpload, { type GalleryImageView, type ImageGalleryAdapter } from '../../../components/ImageGalleryUpload/ImageGalleryUpload.vue';
import ScanButton from '../../../components/ScanButton/ScanButton.vue';
import { useSaving } from '../../../hooks/saving';
import { DetailDescriptionLimit, RecordStatus } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

export interface ProductImageView {
  imageId: string;
  imageUrl: string;
}

export interface ProductCategoryOption {
  categoryId: string;
  categoryName: string;
  status: string;
}

export interface ProductRow {
  productId: string;
  categoryId: string;
  categoryName: string;
  productName: string;
  description: { content: string };
  barcode: string;
  salePrice: string;
  costPrice: string;
  stockQuantity: number;
  quickProduct: boolean;
  status: string;
  imageList: ProductImageView[];
}

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  product: ProductRow | null;
  categoryList: ProductCategoryOption[];
  defaultCategoryId?: string;
}>();
const emit = defineEmits<{
  saved: [];
}>();

const editingProductId = ref('');
const imageGalleryRef = ref<InstanceType<typeof ImageGalleryUpload> | null>(null);
const { saving, runSaving } = useSaving();
const productForm = reactive({
  categoryId: '',
  productName: '',
  description: { content: '' },
  barcode: '',
  salePrice: '',
  costPrice: '',
  quickProduct: false,
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
 * 分类下拉：启用中的分类。编辑时若当前分类已停用，仍保留这一项。
 */
const selectableCategoryList = computed(() => {
  return props.categoryList.filter((categoryRow) => {
    if (categoryRow.status === RecordStatus.ENABLED) {
      return true;
    }
    return categoryRow.categoryId === productForm.categoryId;
  });
});

/**
 * 打开时按传入的商品填表。新建时清空，分类默认当前列表选中项。
 */
watch(visible, (opened) => {
  if (opened !== true) {
    return;
  }
  void fillProductForm(props.product);
});

/**
 * 新建时默认分类：优先当前列表选中的分类，否则第一项启用分类。
 */
function resolveCreateCategoryId(): string {
  if (isEmpty(props.defaultCategoryId) !== true) {
    const matchedCategory = props.categoryList.find((categoryRow) => categoryRow.categoryId === props.defaultCategoryId);
    if (isEmpty(matchedCategory) !== true) {
      return matchedCategory.categoryId;
    }
  }
  const firstEnabledCategory = props.categoryList.find((categoryRow) => categoryRow.status === RecordStatus.ENABLED);
  if (isEmpty(firstEnabledCategory)) {
    return '';
  }
  return firstEnabledCategory.categoryId;
}

/**
 * 把商品记录写进表单，并同步图片列表。
 */
async function fillProductForm(productRow: ProductRow | null): Promise<void> {
  if (isEmpty(productRow)) {
    editingProductId.value = '';
    productForm.categoryId = resolveCreateCategoryId();
    productForm.productName = '';
    productForm.description.content = '';
    productForm.barcode = '';
    productForm.salePrice = '';
    productForm.costPrice = '';
    productForm.quickProduct = false;
    productForm.status = RecordStatus.ENABLED;
    await nextTick();
    imageGalleryRef.value?.clearImages();
    return;
  }
  editingProductId.value = productRow.productId;
  productForm.categoryId = productRow.categoryId;
  productForm.productName = productRow.productName;
  productForm.description.content = isEmpty(productRow.description) || isEmpty(productRow.description.content)
    ? ''
    : productRow.description.content;
  productForm.barcode = productRow.barcode;
  productForm.salePrice = productRow.salePrice;
  productForm.costPrice = productRow.costPrice;
  productForm.quickProduct = productRow.quickProduct === true;
  productForm.status = productRow.status;
  await nextTick();
  imageGalleryRef.value?.setImages(isEmpty(productRow.imageList) ? [] : productRow.imageList);
}

/**
 * 扫码结果写入商品条码。
 */
function onBarcodeScanned(scanText: string): void {
  productForm.barcode = scanText;
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
  await runSaving(async () => {
    const body = {
      categoryId: productForm.categoryId,
      productName: productForm.productName,
      description: { content: productForm.description.content },
      barcode: productForm.barcode,
      salePrice: productForm.salePrice,
      costPrice: productForm.costPrice,
      quickProduct: productForm.quickProduct,
      status: productForm.status,
    };
    if (isEmpty(editingProductId.value)) {
      const createdProduct = (await http.post(StoreApi.PRODUCTS, body)) as ProductRow;
      editingProductId.value = createdProduct.productId;
      await imageGalleryRef.value?.uploadPending();
    } else {
      await http.put(StoreApi.product(editingProductId.value), body);
    }
    ElMessage.success('保存成功');
    visible.value = false;
    emit('saved');
  });
}
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
</style>
