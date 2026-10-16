<template>
  <el-card>
    <el-button v-if="canSave" type="primary" @click="openCreate">新建门店</el-button>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(shopList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="shopRow in shopList" :key="shopRow.shopId">
        <RecordField label="编码">{{ shopRow.shopCode }}</RecordField>
        <RecordField label="名称">{{ shopRow.shopName }}</RecordField>
        <RecordField label="地址">{{ shopRow.address }}</RecordField>
        <RecordField label="电话">{{ shopRow.contactPhone }}</RecordField>
        <RecordField label="状态">
          <el-tag :type="shopRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(shopRow.status) }}
          </el-tag>
        </RecordField>
        <template v-if="canSave" #actions>
          <el-button link type="primary" @click="openEdit(shopRow)">编辑</el-button>
        </template>
      </RecordCard>
    </div>
    <el-dialog v-model="dialogVisible" :title="editingShopId === '' ? '新建门店' : '编辑门店'" width="480px">
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
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="saveShop">保存</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="previewVisible" title="图片预览" width="480px">
      <img class="shop-image-preview" :src="previewUrl" alt="" />
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { UploadRequestOptions, UploadUserFile } from 'element-plus';
import { useRouter } from 'vue-router';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { PermissionCode, RecordStatus, ShopImageLimit, ShopImageMime, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface ShopImageView {
  imageId: string;
  imageUrl: string;
}

interface ShopRow {
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

const shopImageAccept = `${ShopImageMime.JPEG},${ShopImageMime.PNG},${ShopImageMime.WEBP}`;
const router = useRouter();
const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.HOTEL_SHOP_SAVE);
const shopList = ref<ShopRow[]>([]);
const dialogVisible = ref(false);
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
 * 查询已绑定的酒店门店。
 */
async function loadShops(): Promise<void> {
  shopList.value = (await http.get('/admin/hotel/shops')) as ShopRow[];
}

/**
 * 打开新建弹窗。
 */
function openCreate(): void {
  editingShopId.value = '';
  shopForm.shopCode = '';
  shopForm.shopName = '';
  shopForm.address = '';
  shopForm.contactPhone = '';
  shopForm.status = RecordStatus.ENABLED;
  shopImageFileList.value = [];
  dialogVisible.value = true;
}

/**
 * 打开编辑弹窗，并带上已有图片。
 */
function openEdit(shopRow: ShopRow): void {
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
  dialogVisible.value = true;
}

/**
 * 只允许 jpg、png、webp，且不超过大小上限。
 */
function beforeUploadShopImage(file: File): boolean {
  const mimeAllowed = file.type === ShopImageMime.JPEG || file.type === ShopImageMime.PNG || file.type === ShopImageMime.WEBP;
  if (mimeAllowed !== true) {
    ElMessage.error('只支持 jpg、png、webp');
    return false;
  }
  if (file.size > ShopImageLimit.MAX_BYTES) {
    ElMessage.error('图片不能超过5MB');
    return false;
  }
  return true;
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
  dialogVisible.value = false;
  await loadShops();
}

onMounted(() => {
  void loadShops();
});
</script>

<style scoped>
.record-list {
  margin-top: 16px;
}

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
