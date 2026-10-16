<template>
  <ShopSwitcher />
  <el-card>
    <div v-if="isEmpty(roomTypeList) && canSave !== true" class="room-type-empty">暂无数据</div>
    <div v-else class="room-type-grid">
      <button v-if="canSave" type="button" class="room-type-card room-type-create" @click="openCreate">
        <span class="room-type-create-plus">+</span>
        <span>新建房型</span>
      </button>
      <article v-for="roomTypeRow in roomTypeList" :key="roomTypeRow.id" class="room-type-card">
        <div class="room-type-cover">
          <img v-if="!isEmpty(coverImageUrl(roomTypeRow))" :src="coverImageUrl(roomTypeRow)" alt="" />
          <span v-else class="room-type-cover-empty">暂无图片</span>
        </div>
        <div class="room-type-body">
          <div class="room-type-name">{{ roomTypeRow.typeName }}</div>
          <div class="room-type-meta">
            {{ roomTypeRow.bedType === HotelBedType.TWIN ? '双床' : '大床' }} · {{ roomTypeRow.price }}
          </div>
          <div class="room-type-foot">
            <el-tag :type="roomTypeRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
              {{ statusLabel(roomTypeRow.status) }}
            </el-tag>
            <el-button v-if="canSave" link type="primary" @click="openEdit(roomTypeRow)">编辑</el-button>
          </div>
        </div>
      </article>
    </div>
    <el-dialog v-model="dialogVisible" :title="editingId === '' ? '新建房型' : '编辑房型'" width="480px">
      <el-form label-position="top">
        <el-form-item label="名称"><el-input v-model="roomTypeForm.typeName" /></el-form-item>
        <el-form-item label="床型">
          <el-select v-model="roomTypeForm.bedType">
            <el-option label="大床" :value="HotelBedType.LARGE" />
            <el-option label="双床" :value="HotelBedType.TWIN" />
          </el-select>
        </el-form-item>
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
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="saveRoomType">保存</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="previewVisible" title="图片预览" width="480px">
      <img class="room-type-image-preview" :src="previewUrl" alt="" />
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { UploadRequestOptions, UploadUserFile } from 'element-plus';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { HotelBedType, PermissionCode, RecordStatus, ShopImageLimit, ShopImageMime, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { limitImageWidth, replaceUploadRawFile } from '../../../utils/image';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface RoomTypeImageView {
  imageId: string;
  imageUrl: string;
}

interface RoomTypeRow {
  id: string;
  typeName: string;
  bedType: string;
  price: string;
  status: string;
  imageList: RoomTypeImageView[];
}

interface RoomTypeImageFileItem extends UploadUserFile {
  imageId?: string;
}

const roomTypeImageAccept = `${ShopImageMime.JPEG},${ShopImageMime.PNG},${ShopImageMime.WEBP}`;
const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.HOTEL_ROOM_TYPE_SAVE);
const roomTypeList = ref<RoomTypeRow[]>([]);
const dialogVisible = ref(false);
const editingId = ref('');
const roomTypeImageFileList = ref<RoomTypeImageFileItem[]>([]);
const previewVisible = ref(false);
const previewUrl = ref('');
const roomTypeForm = reactive({
  typeName: '',
  bedType: HotelBedType.LARGE as string,
  price: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 封面用第一张房型图片。没有图片时返回空字符串。
 */
function coverImageUrl(roomTypeRow: RoomTypeRow): string {
  if (isEmpty(roomTypeRow.imageList)) {
    return '';
  }
  return roomTypeRow.imageList[0].imageUrl;
}

/**
 * 查询当前门店全部房型。
 */
async function loadRoomTypes(): Promise<void> {
  const pageResult = (await http.get('/admin/hotel/room-types')) as { list: RoomTypeRow[] };
  roomTypeList.value = pageResult.list;
}

/**
 * 打开新建房型。
 */
function openCreate(): void {
  editingId.value = '';
  roomTypeForm.typeName = '';
  roomTypeForm.bedType = HotelBedType.LARGE;
  roomTypeForm.price = '';
  roomTypeForm.status = RecordStatus.ENABLED;
  roomTypeImageFileList.value = [];
  dialogVisible.value = true;
}

/**
 * 打开编辑房型。
 */
function openEdit(roomTypeRow: RoomTypeRow): void {
  editingId.value = roomTypeRow.id;
  roomTypeForm.typeName = roomTypeRow.typeName;
  roomTypeForm.bedType = roomTypeRow.bedType;
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
  dialogVisible.value = true;
}

/**
 * 保存房型。新建成功后再补传选中的图片。
 */
async function saveRoomType(): Promise<void> {
  if (isEmpty(editingId.value)) {
    const createdRoomType = (await http.post('/admin/hotel/room-types', roomTypeForm)) as RoomTypeRow;
    editingId.value = createdRoomType.id;
    await uploadPendingRoomTypeImages(createdRoomType.id);
  } else {
    await http.put(`/admin/hotel/room-types/${editingId.value}`, roomTypeForm);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  await loadRoomTypes();
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
  await http.delete(`/admin/hotel/room-types/${editingId.value}/images/${fileItem.imageId}`);
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
  return (await http.post(`/admin/hotel/room-types/${roomTypeId}/images`, formData)) as RoomTypeImageView;
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

onMounted(() => {
  void loadRoomTypes();
});
</script>

<style scoped>
.room-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.room-type-card {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.room-type-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  background: #f4f6f8;
}

.room-type-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.room-type-cover-empty {
  font-size: 13px;
  color: #909399;
}

.room-type-body {
  padding: 12px;
}

.room-type-create {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 240px;
  padding: 0;
  font: inherit;
  font-size: 14px;
  color: #667085;
  cursor: pointer;
  background: #ffffff;
  border: 1px dashed #c8cdd4;
}

.room-type-create-plus {
  font-size: 32px;
  line-height: 1;
  color: #98a2b3;
}

.room-type-name {
  font-size: 16px;
  font-weight: 600;
  color: #1c2434;
  word-break: break-word;
}

.room-type-meta {
  margin-top: 4px;
  font-size: 13px;
  color: #667085;
  word-break: break-word;
}

.room-type-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.room-type-empty {
  color: #909399;
}

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
