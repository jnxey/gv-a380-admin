<template>
  <el-dialog v-model="visible" :title="isEmpty(roomType) ? '新建房型' : '编辑房型'" width="480px">
    <el-form label-position="top">
      <el-form-item label="名称"><el-input v-model="roomTypeForm.typeName" /></el-form-item>
      <el-form-item label="每晚价格"><el-input v-model="roomTypeForm.price" /></el-form-item>
      <el-form-item label="状态">
        <el-select v-model="roomTypeForm.status">
          <el-option label="启用" :value="RecordStatus.ENABLED" />
          <el-option label="停用" :value="RecordStatus.DISABLED" />
        </el-select>
      </el-form-item>
      <el-form-item label="图片">
        <el-upload
          v-model:file-list="roomTypeImageFileList"
          :class="{ 'room-type-image-full': roomTypeImageFileList.length >= ShopImageLimit.MAX_COUNT }"
          list-type="picture-card"
          :limit="ShopImageLimit.MAX_COUNT"
          :accept="roomTypeImageAccept"
          :http-request="uploadRoomTypeImage"
          :before-upload="beforeUploadRoomTypeImage"
          :on-remove="removeRoomTypeImage"
          :on-preview="previewRoomTypeImage"
          :on-exceed="onRoomTypeImageExceed"
        >
          <span class="room-type-image-add">+</span>
        </el-upload>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button size="large" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" @click="saveRoomType">保存</el-button>
    </template>
  </el-dialog>
  <el-dialog v-model="previewVisible" title="图片预览" width="480px">
    <img class="room-type-image-preview" :src="previewUrl" alt="" />
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { UploadRequestOptions, UploadUserFile } from 'element-plus';
import { RecordStatus, ShopImageLimit, ShopImageMime } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { limitImageWidth, replaceUploadRawFile } from '../../../utils/image';
import http from '../../../utils/request';

export interface RoomTypeImageView {
  imageId: string;
  imageUrl: string;
}

export interface RoomTypeRow {
  id: string;
  typeName: string;
  price: string;
  status: string;
  imageList: RoomTypeImageView[];
}

interface RoomTypeImageFileItem extends UploadUserFile {
  imageId?: string;
}

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  roomType: RoomTypeRow | null;
}>();
const emit = defineEmits<{
  saved: [];
}>();

const roomTypeImageAccept = `${ShopImageMime.JPEG},${ShopImageMime.PNG},${ShopImageMime.WEBP}`;
const editingId = ref('');
const roomTypeImageFileList = ref<RoomTypeImageFileItem[]>([]);
const previewVisible = ref(false);
const previewUrl = ref('');
const roomTypeForm = reactive({
  typeName: '',
  price: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 打开时按传入的房型填表。新建时清空。
 */
watch(visible, (opened) => {
  if (opened !== true) {
    return;
  }
  fillRoomTypeForm(props.roomType);
});

/**
 * 把房型写进表单，并带上已有图片。
 */
function fillRoomTypeForm(roomTypeRow: RoomTypeRow | null): void {
  if (isEmpty(roomTypeRow)) {
    editingId.value = '';
    roomTypeForm.typeName = '';
    roomTypeForm.price = '';
    roomTypeForm.status = RecordStatus.ENABLED;
    roomTypeImageFileList.value = [];
    return;
  }
  editingId.value = roomTypeRow.id;
  roomTypeForm.typeName = roomTypeRow.typeName;
  roomTypeForm.price = roomTypeRow.price;
  roomTypeForm.status = roomTypeRow.status;
  const imageList = isEmpty(roomTypeRow.imageList) ? [] : roomTypeRow.imageList;
  roomTypeImageFileList.value = imageList.map((roomTypeImage) => {
    return {
      name: roomTypeImage.imageId,
      url: roomTypeImage.imageUrl,
      imageId: roomTypeImage.imageId,
    };
  });
}

/**
 * 保存房型。新建成功后再补传选中的图片。
 */
async function saveRoomType(): Promise<void> {
  if (isEmpty(editingId.value)) {
    const createdRoomType = (await http.post('/a380/hotel/room-types', roomTypeForm)) as RoomTypeRow;
    editingId.value = createdRoomType.id;
    await uploadPendingRoomTypeImages(createdRoomType.id);
  } else {
    await http.put(`\/a380/hotel/room-types/${editingId.value}`, roomTypeForm);
  }
  ElMessage.success('保存成功');
  visible.value = false;
  emit('saved');
}

/**
 * 只允许 jpg、png、webp，且不超过大小上限。通过后把过宽的图缩小。
 */
async function beforeUploadRoomTypeImage(file: File): Promise<boolean | File> {
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
function onRoomTypeImageExceed(): void {
  ElMessage.warning(`房型图片最多${ShopImageLimit.MAX_COUNT}张`);
}

/**
 * 编辑时立即上传。新建时只留在列表里，等房型保存成功后再传。
 */
async function uploadRoomTypeImage(options: UploadRequestOptions): Promise<void> {
  replaceUploadRawFile(roomTypeImageFileList.value, options.file);
  if (isEmpty(editingId.value)) {
    options.onSuccess({});
    return;
  }
  try {
    const imageView = await postRoomTypeImage(editingId.value, options.file);
    const currentFile = roomTypeImageFileList.value.find((fileItem) => fileItem.uid === options.file.uid);
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
async function removeRoomTypeImage(fileItem: RoomTypeImageFileItem): Promise<void> {
  if (isEmpty(fileItem.imageId) || isEmpty(editingId.value)) {
    return;
  }
  await http.delete(`\/a380/hotel/room-types/${editingId.value}/images/${fileItem.imageId}`);
}

/**
 * 预览一张房型图片。
 */
function previewRoomTypeImage(fileItem: RoomTypeImageFileItem): void {
  previewUrl.value = isEmpty(fileItem.url) ? '' : fileItem.url;
  previewVisible.value = true;
}

/**
 * 把一张图片传到指定房型。
 */
async function postRoomTypeImage(roomTypeId: string, file: File): Promise<RoomTypeImageView> {
  const formData = new FormData();
  formData.append('file', file);
  return (await http.post(`\/a380/hotel/room-types/${roomTypeId}/images`, formData)) as RoomTypeImageView;
}

/**
 * 把房型保存前选中、尚未上传的图片补传上去。
 */
async function uploadPendingRoomTypeImages(roomTypeId: string): Promise<void> {
  const pendingFileList = roomTypeImageFileList.value.filter((fileItem) => isEmpty(fileItem.imageId) && !isEmpty(fileItem.raw));
  for (const fileItem of pendingFileList) {
    if (isEmpty(fileItem.raw)) {
      continue;
    }
    const imageView = await postRoomTypeImage(roomTypeId, fileItem.raw);
    fileItem.imageId = imageView.imageId;
    fileItem.url = imageView.imageUrl;
  }
}
</script>

<style scoped>
.room-type-image-add {
  font-size: 28px;
  line-height: 1;
  color: #909399;
}

.room-type-image-full :deep(.el-upload--picture-card) {
  display: none;
}

.room-type-image-preview {
  display: block;
  width: 100%;
}
</style>
