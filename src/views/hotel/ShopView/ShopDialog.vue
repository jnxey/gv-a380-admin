<template>
  <el-dialog v-model="visible" :title="isEmpty(shop) ? '新建门店' : '编辑门店'" width="480px">
    <el-form label-position="top">
      <el-form-item label="编码"><el-input v-model="shopForm.shopCode" /></el-form-item>
      <el-form-item label="名称"><el-input v-model="shopForm.shopName" /></el-form-item>
      <el-form-item label="地址"><el-input v-model="shopForm.address" /></el-form-item>
      <el-form-item label="电话"><el-input v-model="shopForm.contactPhone" /></el-form-item>
      <el-form-item label="状态">
        <el-select v-model="shopForm.status">
          <el-option label="启用" :value="RecordStatus.ENABLED" />
          <el-option label="停用" :value="RecordStatus.DISABLED" />
        </el-select>
      </el-form-item>
      <el-form-item label="图片">
        <el-upload
          v-model:file-list="shopImageFileList"
          :class="{ 'shop-image-full': shopImageFileList.length >= ShopImageLimit.MAX_COUNT }"
          list-type="picture-card"
          :limit="ShopImageLimit.MAX_COUNT"
          :accept="shopImageAccept"
          :http-request="uploadShopImage"
          :before-upload="beforeUploadShopImage"
          :on-remove="removeShopImage"
          :on-preview="previewShopImage"
          :on-exceed="onShopImageExceed"
        >
          <span class="shop-image-add">+</span>
        </el-upload>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button size="large" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" @click="saveShop">保存</el-button>
    </template>
  </el-dialog>
  <el-dialog v-model="previewVisible" title="图片预览" width="480px">
    <img class="shop-image-preview" :src="previewUrl" alt="" />
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { UploadRequestOptions, UploadUserFile } from 'element-plus';
import { useRouter } from 'vue-router';
import { RecordStatus, ShopImageLimit, ShopImageMime } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { limitImageWidth, replaceUploadRawFile } from '../../../utils/image';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

export interface ShopImageView {
  imageId: string;
  imageUrl: string;
}

export interface ShopRow {
  shopId: string;
  shopCode: string;
  shopName: string;
  address: string;
  contactPhone: string;
  status: string;
  imageList: ShopImageView[];
}

interface ShopImageFileItem extends UploadUserFile {
  imageId?: string;
}

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  shop: ShopRow | null;
}>();
const emit = defineEmits<{
  saved: [];
}>();

const shopImageAccept = `${ShopImageMime.JPEG},${ShopImageMime.PNG},${ShopImageMime.WEBP}`;
const router = useRouter();
const sessionStore = useSessionStore();
const editingShopId = ref('');
const shopImageFileList = ref<ShopImageFileItem[]>([]);
const previewVisible = ref(false);
const previewUrl = ref('');
const shopForm = reactive({
  shopCode: '',
  shopName: '',
  address: '',
  contactPhone: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 打开时按传入的门店填表。新建时清空。
 */
watch(visible, (opened) => {
  if (opened !== true) {
    return;
  }
  fillShopForm(props.shop);
});

/**
 * 把门店记录写进表单，并带上已有图片。
 */
function fillShopForm(shopRow: ShopRow | null): void {
  if (isEmpty(shopRow)) {
    editingShopId.value = '';
    shopForm.shopCode = '';
    shopForm.shopName = '';
    shopForm.address = '';
    shopForm.contactPhone = '';
    shopForm.status = RecordStatus.ENABLED;
    shopImageFileList.value = [];
    return;
  }
  editingShopId.value = shopRow.shopId;
  shopForm.shopCode = shopRow.shopCode;
  shopForm.shopName = shopRow.shopName;
  shopForm.address = shopRow.address;
  shopForm.contactPhone = shopRow.contactPhone;
  shopForm.status = shopRow.status;
  const imageList = isEmpty(shopRow.imageList) ? [] : shopRow.imageList;
  shopImageFileList.value = imageList.map((shopImage) => {
    return {
      name: shopImage.imageId,
      url: shopImage.imageUrl,
      imageId: shopImage.imageId,
    };
  });
}

/**
 * 只允许 jpg、png、webp，且不超过大小上限。通过后把过宽的图缩小。
 */
async function beforeUploadShopImage(file: File): Promise<boolean | File> {
  const mimeAllowed = file.type === ShopImageMime.JPEG || file.type === ShopImageMime.PNG || file.type === ShopImageMime.WEBP;
  if (!mimeAllowed) {
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
function onShopImageExceed(): void {
  ElMessage.warning(`门店图片最多${ShopImageLimit.MAX_COUNT}张`);
}

/**
 * 编辑时立即上传。新建时只留在列表里，等门店保存成功后再传。
 */
async function uploadShopImage(options: UploadRequestOptions): Promise<void> {
  replaceUploadRawFile(shopImageFileList.value, options.file);
  if (isEmpty(editingShopId.value)) {
    options.onSuccess({});
    return;
  }
  try {
    const imageView = await postShopImage(editingShopId.value, options.file);
    const currentFile = shopImageFileList.value.find((fileItem) => fileItem.uid === options.file.uid);
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
async function removeShopImage(fileItem: ShopImageFileItem): Promise<void> {
  if (isEmpty(fileItem.imageId) || isEmpty(editingShopId.value)) {
    return;
  }
  await http.delete(`/admin/hotel/shops/${editingShopId.value}/images/${fileItem.imageId}`);
}

/**
 * 预览一张门店图片。
 */
function previewShopImage(fileItem: ShopImageFileItem): void {
  previewUrl.value = isEmpty(fileItem.url) ? '' : fileItem.url;
  previewVisible.value = true;
}

/**
 * 把一张图片传到指定门店。
 */
async function postShopImage(shopId: string, file: File): Promise<ShopImageView> {
  const formData = new FormData();
  formData.append('file', file);
  return (await http.post(`/admin/hotel/shops/${shopId}/images`, formData)) as ShopImageView;
}

/**
 * 把门店保存前选中、尚未上传的图片补传上去。
 */
async function uploadPendingShopImages(shopId: string): Promise<void> {
  const pendingFileList = shopImageFileList.value.filter((fileItem) => isEmpty(fileItem.imageId) && !isEmpty(fileItem.raw));
  for (const fileItem of pendingFileList) {
    if (isEmpty(fileItem.raw)) {
      continue;
    }
    const imageView = await postShopImage(shopId, fileItem.raw);
    fileItem.imageId = imageView.imageId;
    fileItem.url = imageView.imageUrl;
  }
}

/**
 * 保存门店。新建后先刷新登录态，再上传选中的图片。
 */
async function saveShop(): Promise<void> {
  if (isEmpty(editingShopId.value)) {
    const createdShop = (await http.post('/admin/hotel/shops', shopForm)) as ShopRow;
    editingShopId.value = createdShop.shopId;
    sessionStore.menuLoaded = false;
    await sessionStore.loadSession(router);
    await uploadPendingShopImages(createdShop.shopId);
  } else {
    await http.put(`/admin/hotel/shops/${editingShopId.value}`, shopForm);
  }
  ElMessage.success('保存成功');
  visible.value = false;
  emit('saved');
}
</script>

<style scoped>
.shop-image-add {
  font-size: 28px;
  line-height: 1;
  color: #909399;
}

.shop-image-full :deep(.el-upload--picture-card) {
  display: none;
}

.shop-image-preview {
  display: block;
  width: 100%;
}
</style>
