<template>
  <div class="image-gallery-block">
    <el-upload
      v-model:file-list="imageFileList"
      :class="{ 'image-gallery-full': imageFileList.length >= ShopImageLimit.MAX_COUNT }"
      list-type="picture-card"
      :limit="ShopImageLimit.MAX_COUNT"
      :accept="imageAccept"
      :http-request="uploadImage"
      :before-upload="beforeUploadImage"
      :on-remove="removeSavedImage"
      :on-preview="previewImage"
      :on-exceed="onImageExceed"
    >
      <template v-if="enableCover" #file="{ file }">
        <div class="image-gallery-card">
          <img class="image-gallery-thumb" :src="file.url" alt="" />
          <span v-if="isCoverImage(file)" class="image-gallery-cover">封面</span>
          <button
            v-else
            type="button"
            class="image-gallery-cover image-gallery-cover-set"
            @click.stop="setCoverImage(file)"
          >
            设为封面
          </button>
          <span class="image-gallery-actions">
            <button type="button" class="image-gallery-action" @click.stop="previewImage(file)">预览</button>
            <button type="button" class="image-gallery-action is-danger" @click.stop="removeImageFile(file)">删除</button>
          </span>
        </div>
      </template>
      <span class="image-gallery-add">+</span>
    </el-upload>
    <div v-if="isEmpty(tipText) !== true" class="image-gallery-tip">{{ tipText }}</div>
  </div>
  <el-dialog v-model="previewVisible" title="图片预览" width="480px">
    <img class="image-gallery-preview" :src="previewUrl" alt="" />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { UploadRequestOptions, UploadUserFile } from 'element-plus';
import { ShopImageLimit, ShopImageMime } from '../../utils/constants';
import { isEmpty } from '../../utils/tools';
import { limitImageWidth, replaceUploadRawFile } from '../../utils/image';

export interface GalleryImageView {
  imageId: string;
  imageUrl: string;
}

export interface ImageGalleryAdapter {
  upload: (ownerId: string, file: File) => Promise<GalleryImageView>;
  remove: (ownerId: string, imageId: string) => Promise<void>;
  sort?: (ownerId: string, imageIdList: string[]) => Promise<void>;
}

interface GalleryImageFileItem extends UploadUserFile {
  imageId?: string;
}

const props = withDefaults(
  defineProps<{
    ownerId: string;
    adapter: ImageGalleryAdapter;
    enableCover?: boolean;
    exceedLabel: string;
    tip?: string | false;
  }>(),
  {
    enableCover: true,
    tip: undefined,
  },
);

const imageAccept = `${ShopImageMime.JPEG},${ShopImageMime.PNG},${ShopImageMime.WEBP}`;
const imageFileList = ref<GalleryImageFileItem[]>([]);
const previewVisible = ref(false);
const previewUrl = ref('');

/**
 * 封面模式下的默认提示；传 tip=false 时不显示。
 */
const tipText = computed(() => {
  if (props.tip === false) {
    return '';
  }
  if (isEmpty(props.tip) !== true) {
    return props.tip;
  }
  if (props.enableCover) {
    return '第一张为封面，可将其它图设为封面';
  }
  return '';
});

/**
 * 用已有图片填列表。新建时传空数组。
 */
function setImages(imageList: GalleryImageView[]): void {
  const sourceList = isEmpty(imageList) ? [] : imageList;
  imageFileList.value = sourceList.map((galleryImage) => {
    return {
      name: galleryImage.imageId,
      url: galleryImage.imageUrl,
      imageId: galleryImage.imageId,
    };
  });
}

/**
 * 清空图片列表。
 */
function clearImages(): void {
  imageFileList.value = [];
}

/**
 * 把保存前选中、尚未上传的图片补传到当前 ownerId。
 */
async function uploadPending(): Promise<void> {
  if (isEmpty(props.ownerId)) {
    return;
  }
  const pendingFileList = imageFileList.value.filter((fileItem) => isEmpty(fileItem.imageId) && isEmpty(fileItem.raw) !== true);
  for (const fileItem of pendingFileList) {
    if (isEmpty(fileItem.raw)) {
      continue;
    }
    const imageView = await props.adapter.upload(props.ownerId, fileItem.raw);
    fileItem.imageId = imageView.imageId;
    fileItem.url = imageView.imageUrl;
  }
}

defineExpose({
  setImages,
  clearImages,
  uploadPending,
});

/**
 * 只允许 jpg、png、webp，且不超过大小上限。通过后把过宽的图缩小。
 */
async function beforeUploadImage(file: File): Promise<boolean | File> {
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
 * 已满上限时提示，不再加入列表。
 */
function onImageExceed(): void {
  ElMessage.warning(`${props.exceedLabel}最多${ShopImageLimit.MAX_COUNT}张`);
}

/**
 * 编辑时立即上传。新建时只留在列表里，等主体保存成功后再传。
 */
async function uploadImage(options: UploadRequestOptions): Promise<void> {
  replaceUploadRawFile(imageFileList.value, options.file);
  if (isEmpty(props.ownerId)) {
    options.onSuccess({});
    return;
  }
  try {
    const imageView = await props.adapter.upload(props.ownerId, options.file);
    const currentFile = imageFileList.value.find((fileItem) => fileItem.uid === options.file.uid);
    if (isEmpty(currentFile) !== true) {
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
async function removeSavedImage(fileItem: GalleryImageFileItem): Promise<void> {
  if (isEmpty(fileItem.imageId) || isEmpty(props.ownerId)) {
    return;
  }
  await props.adapter.remove(props.ownerId, fileItem.imageId);
}

/**
 * 自定义卡片上的删除：先删服务端，再移出列表。
 */
async function removeImageFile(fileItem: GalleryImageFileItem): Promise<void> {
  await removeSavedImage(fileItem);
  imageFileList.value = imageFileList.value.filter((imageFile) => imageFile.uid !== fileItem.uid);
}

/**
 * 预览一张图片。
 */
function previewImage(fileItem: GalleryImageFileItem): void {
  previewUrl.value = isEmpty(fileItem.url) ? '' : fileItem.url;
  previewVisible.value = true;
}

/**
 * 当前列表第一张是封面。
 */
function isCoverImage(fileItem: GalleryImageFileItem): boolean {
  if (isEmpty(imageFileList.value)) {
    return false;
  }
  return imageFileList.value[0].uid === fileItem.uid;
}

/**
 * 把一张图挪到第一位作为封面。已保存且有 sort 时会同步排序。
 */
async function setCoverImage(fileItem: GalleryImageFileItem): Promise<void> {
  const imageIndex = imageFileList.value.findIndex((imageFile) => imageFile.uid === fileItem.uid);
  if (imageIndex <= 0) {
    return;
  }
  const nextImageList = [...imageFileList.value];
  const [coverImage] = nextImageList.splice(imageIndex, 1);
  nextImageList.unshift(coverImage);
  imageFileList.value = nextImageList;
  await syncImageSortOrder();
}

/**
 * 按当前列表顺序把已上传图片的排序写回服务端。第一张是封面。还有未上传图或没有 sort 时不同步。
 */
async function syncImageSortOrder(): Promise<void> {
  if (isEmpty(props.ownerId) || isEmpty(props.adapter.sort)) {
    return;
  }
  const imageIdList: string[] = [];
  for (const imageFile of imageFileList.value) {
    if (isEmpty(imageFile.imageId)) {
      return;
    }
    imageIdList.push(imageFile.imageId);
  }
  if (isEmpty(imageIdList)) {
    return;
  }
  await props.adapter.sort(props.ownerId, imageIdList);
}
</script>

<style scoped>
.image-gallery-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}

.image-gallery-tip {
  margin-top: 8px;
  font-size: 10px;
  line-height: 18px;
  color: #667085;
}

.image-gallery-add {
  font-size: 28px;
  line-height: 1;
  color: #909399;
}

.image-gallery-card {
  position: relative;
  width: 100%;
  height: 100%;
}

.image-gallery-thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-gallery-cover {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 1;
  padding: 0 6px;
  font: inherit;
  font-size: 10px;
  line-height: 20px;
  color: #ffffff;
  background: rgba(28, 36, 52, 0.72);
  border: none;
  border-radius: 4px;
}

.image-gallery-cover-set {
  cursor: pointer;
}

.image-gallery-actions {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  padding: 6px 4px;
  background: rgba(28, 36, 52, 0.72);
}

.image-gallery-action {
  padding: 0;
  font: inherit;
  font-size: 10px;
  line-height: 18px;
  color: #ffffff;
  cursor: pointer;
  background: transparent;
  border: none;
}

.image-gallery-action.is-danger {
  color: #f1554a;
}

.image-gallery-full :deep(.el-upload--picture-card) {
  display: none;
}

.image-gallery-preview {
  display: block;
  width: 100%;
}
</style>
