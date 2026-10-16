<template>
  <ShopSwitcher />
  <el-card>
    <div v-if="isEmpty(roomList) && canSave !== true" class="room-empty">暂无数据</div>
    <div v-else class="room-grid">
      <button v-if="canSave" type="button" class="room-card room-create" @click="openCreate">
        <span class="room-create-plus">+</span>
        <span>新建包厢</span>
      </button>
      <article v-for="roomRow in roomList" :key="roomRow.id" class="room-card">
        <div class="room-cover">
          <img v-if="!isEmpty(coverImageUrl(roomRow))" :src="coverImageUrl(roomRow)" alt="" />
          <span v-else class="room-cover-empty">暂无图片</span>
        </div>
        <div class="room-body">
          <div class="room-name">{{ roomRow.roomName }}</div>
          <div class="room-meta">{{ roomRow.roomNo }} · {{ statusLabel(roomRow.roomType) }} · {{ roomRow.capacity }}人</div>
          <div class="room-price">{{ roomRow.price }}</div>
          <div class="room-foot">
            <el-tag :type="roomRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
              {{ statusLabel(roomRow.status) }}
            </el-tag>
            <el-button v-if="canSave" link type="primary" @click="openEdit(roomRow)">编辑</el-button>
          </div>
        </div>
      </article>
    </div>
    <el-dialog v-model="dialogVisible" :title="editingRoomId === '' ? '新建包厢' : '编辑包厢'" width="480px">
      <el-form label-position="top">
        <el-form-item label="编号"><el-input v-model="roomForm.roomNo" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="roomForm.roomName" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="roomForm.roomType">
            <el-option label="小包" :value="KtvRoomType.SMALL" />
            <el-option label="中包" :value="KtvRoomType.MEDIUM" />
            <el-option label="大包" :value="KtvRoomType.LARGE" />
          </el-select>
        </el-form-item>
        <el-form-item label="人数"><el-input v-model.number="roomForm.capacity" /></el-form-item>
        <el-form-item label="价格"><el-input v-model="roomForm.price" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="roomForm.status">
            <el-option label="启用" :value="RecordStatus.ENABLED" />
            <el-option label="停用" :value="RecordStatus.DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            v-model:file-list="roomImageFileList"
            :class="{ 'room-image-full': roomImageFileList.length >= ShopImageLimit.MAX_COUNT }"
            list-type="picture-card"
            :limit="ShopImageLimit.MAX_COUNT"
            :accept="roomImageAccept"
            :http-request="uploadRoomImage"
            :before-upload="beforeUploadRoomImage"
            :on-remove="removeRoomImage"
            :on-preview="previewRoomImage"
            :on-exceed="onRoomImageExceed"
          >
            <span class="room-image-add">+</span>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="saveRoom">保存</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="previewVisible" title="图片预览" width="480px">
      <img class="room-image-preview" :src="previewUrl" alt="" />
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { UploadRequestOptions, UploadUserFile } from 'element-plus';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { KtvRoomType, PermissionCode, RecordStatus, ShopImageLimit, ShopImageMime, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface RoomImageView {
  imageId: string;
  imageUrl: string;
}

interface RoomRow {
  id: string;
  roomNo: string;
  roomName: string;
  roomType: string;
  capacity: number;
  price: string;
  status: string;
  imageList: RoomImageView[];
}

interface RoomImageFileItem extends UploadUserFile {
  imageId?: string;
}

const roomImageAccept = `${ShopImageMime.JPEG},${ShopImageMime.PNG},${ShopImageMime.WEBP}`;
const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.KTV_ROOM_SAVE);
const roomList = ref<RoomRow[]>([]);
const dialogVisible = ref(false);
const editingRoomId = ref('');
const roomImageFileList = ref<RoomImageFileItem[]>([]);
const previewVisible = ref(false);
const previewUrl = ref('');
const roomForm = reactive({
  roomNo: '',
  roomName: '',
  roomType: KtvRoomType.SMALL as string,
  capacity: 4,
  price: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 封面用第一张包厢图片。没有图片时返回空字符串。
 */
function coverImageUrl(roomRow: RoomRow): string {
  if (isEmpty(roomRow.imageList)) {
    return '';
  }
  return roomRow.imageList[0].imageUrl;
}

/**
 * 查询当前门店全部包厢。
 */
async function loadRooms(): Promise<void> {
  const pageResult = (await http.get('/admin/ktv/rooms')) as {
    list: RoomRow[];
  };
  roomList.value = pageResult.list;
}

/**
 * 打开新建包厢。
 */
function openCreate(): void {
  editingRoomId.value = '';
  roomForm.roomNo = '';
  roomForm.roomName = '';
  roomForm.roomType = KtvRoomType.SMALL;
  roomForm.capacity = 4;
  roomForm.price = '';
  roomForm.status = RecordStatus.ENABLED;
  roomImageFileList.value = [];
  dialogVisible.value = true;
}

/**
 * 打开编辑包厢。
 */
function openEdit(roomRow: RoomRow): void {
  editingRoomId.value = roomRow.id;
  roomForm.roomNo = roomRow.roomNo;
  roomForm.roomName = roomRow.roomName;
  roomForm.roomType = roomRow.roomType;
  roomForm.capacity = roomRow.capacity;
  roomForm.price = roomRow.price;
  roomForm.status = roomRow.status;
  const imageList = isEmpty(roomRow.imageList) ? [] : roomRow.imageList;
  roomImageFileList.value = imageList.map((roomImage) => {
    return {
      name: roomImage.imageId,
      url: roomImage.imageUrl,
      imageId: roomImage.imageId,
    };
  });
  dialogVisible.value = true;
}

/**
 * 保存包厢到当前门店。新建成功后再补传选中的图片。
 */
async function saveRoom(): Promise<void> {
  if (isEmpty(editingRoomId.value)) {
    const createdRoom = (await http.post('/admin/ktv/rooms', roomForm)) as RoomRow;
    editingRoomId.value = createdRoom.id;
    await uploadPendingRoomImages(createdRoom.id);
  } else {
    await http.put(`/admin/ktv/rooms/${editingRoomId.value}`, roomForm);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  await loadRooms();
}

/**
 * 只允许 jpg、png、webp，且不超过大小上限。
 */
function beforeUploadRoomImage(file: File): boolean {
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
function onRoomImageExceed(): void {
  ElMessage.warning(`包厢图片最多${ShopImageLimit.MAX_COUNT}张`);
}

/**
 * 编辑时立即上传。新建时只留在列表里，等包厢保存成功后再传。
 */
async function uploadRoomImage(options: UploadRequestOptions): Promise<void> {
  if (isEmpty(editingRoomId.value)) {
    options.onSuccess({});
    return;
  }
  try {
    const imageView = await postRoomImage(editingRoomId.value, options.file);
    const currentFile = roomImageFileList.value.find((fileItem) => fileItem.uid === options.file.uid);
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
async function removeRoomImage(fileItem: RoomImageFileItem): Promise<void> {
  if (isEmpty(fileItem.imageId) || isEmpty(editingRoomId.value)) {
    return;
  }
  await http.delete(`/admin/ktv/rooms/${editingRoomId.value}/images/${fileItem.imageId}`);
}

/**
 * 预览一张包厢图片。
 */
function previewRoomImage(fileItem: RoomImageFileItem): void {
  previewUrl.value = isEmpty(fileItem.url) ? '' : fileItem.url;
  previewVisible.value = true;
}

/**
 * 把一张图片传到指定包厢。
 */
async function postRoomImage(roomId: string, file: File): Promise<RoomImageView> {
  const formData = new FormData();
  formData.append('file', file);
  return (await http.post(`/admin/ktv/rooms/${roomId}/images`, formData)) as RoomImageView;
}

/**
 * 把包厢保存前选中、尚未上传的图片补传上去。
 */
async function uploadPendingRoomImages(roomId: string): Promise<void> {
  const pendingFileList = roomImageFileList.value.filter((fileItem) => isEmpty(fileItem.imageId) && !isEmpty(fileItem.raw));
  for (const fileItem of pendingFileList) {
    if (isEmpty(fileItem.raw)) {
      continue;
    }
    const imageView = await postRoomImage(roomId, fileItem.raw);
    fileItem.imageId = imageView.imageId;
    fileItem.url = imageView.imageUrl;
  }
}

onMounted(() => {
  void loadRooms();
});
</script>

<style scoped>
.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.room-card {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.room-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  background: #f4f6f8;
}

.room-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.room-cover-empty {
  font-size: 13px;
  color: #909399;
}

.room-body {
  padding: 12px;
}

.room-create {
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

.room-create-plus {
  font-size: 32px;
  line-height: 1;
  color: #98a2b3;
}

.room-name {
  font-size: 16px;
  font-weight: 600;
  color: #1c2434;
  word-break: break-word;
}

.room-meta,
.room-price {
  margin-top: 4px;
  font-size: 13px;
  color: #667085;
  word-break: break-word;
}

.room-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.room-empty {
  color: #909399;
}

.room-image-add {
  font-size: 28px;
  line-height: 1;
  color: #909399;
}

.room-image-full :deep(.el-upload--picture-card) {
  display: none;
}

.room-image-preview {
  display: block;
  width: 100%;
}
</style>
