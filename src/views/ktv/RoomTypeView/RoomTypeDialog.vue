<template>
  <el-dialog v-model="visible" :title="isEmpty(roomType) ? '新建类型' : '编辑类型'" width="480px">
    <el-form label-position="top">
      <el-form-item label="名称"><el-input v-model="roomTypeForm.typeName" /></el-form-item>
      <el-form-item label="每小时价格"><el-input v-model="roomTypeForm.hourlyPrice" /></el-form-item>
      <el-form-item label="状态">
        <el-select v-model="roomTypeForm.status">
          <el-option label="启用" :value="RecordStatus.ENABLED" />
          <el-option label="停用" :value="RecordStatus.DISABLED" />
        </el-select>
      </el-form-item>
      <el-form-item label="详细描述">
        <el-input
          v-model="roomTypeForm.description"
          type="textarea"
          :rows="3"
          :maxlength="DetailDescriptionLimit.MAX_LENGTH"
          show-word-limit
          placeholder="选填"
        />
      </el-form-item>
      <el-form-item label="图片">
        <ImageGalleryUpload
          ref="imageGalleryRef"
          :owner-id="editingId"
          :adapter="roomTypeImageAdapter"
          exceed-label="包厢类型图片"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button size="large" :disabled="saving" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" :loading="saving" @click="saveRoomType">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { KtvApi } from '../../../api/ktv';
import { nextTick, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import ImageGalleryUpload, { type GalleryImageView, type ImageGalleryAdapter } from '../../../components/ImageGalleryUpload/ImageGalleryUpload.vue';
import { useSaving } from '../../../hooks/saving';
import { DetailDescriptionLimit, RecordStatus } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

export type RoomTypeImageView = GalleryImageView;

export interface RoomTypeRow {
  id: string;
  typeName: string;
  description: string;
  hourlyPrice: string;
  status: string;
  roomCount: number;
  imageList: RoomTypeImageView[];
}

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  roomType: RoomTypeRow | null;
}>();
const emit = defineEmits<{
  saved: [];
}>();

const editingId = ref('');
const imageGalleryRef = ref<InstanceType<typeof ImageGalleryUpload> | null>(null);
const { saving, runSaving } = useSaving();
const roomTypeForm = reactive({
  typeName: '',
  description: '',
  hourlyPrice: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 包厢类型图片的上传、删除和排序。
 */
const roomTypeImageAdapter: ImageGalleryAdapter = {
  async upload(ownerId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return (await http.post(KtvApi.roomTypeImages(ownerId), formData)) as GalleryImageView;
  },
  async remove(ownerId, imageId) {
    await http.delete(KtvApi.roomTypeImage(ownerId, imageId));
  },
  async sort(ownerId, imageIdList) {
    await http.post(KtvApi.roomTypeImagesSort(ownerId), { idList: imageIdList });
  },
};

/**
 * 打开时按传入的类型填表。新建时清空。
 */
watch(visible, async (opened) => {
  if (opened !== true) {
    return;
  }
  await nextTick();
  fillRoomTypeForm(props.roomType);
});

/**
 * 把包厢类型写进表单，并带上已有图片。
 */
function fillRoomTypeForm(roomTypeRow: RoomTypeRow | null): void {
  if (isEmpty(roomTypeRow)) {
    editingId.value = '';
    roomTypeForm.typeName = '';
    roomTypeForm.description = '';
    roomTypeForm.hourlyPrice = '';
    roomTypeForm.status = RecordStatus.ENABLED;
    imageGalleryRef.value?.clearImages();
    return;
  }
  editingId.value = roomTypeRow.id;
  roomTypeForm.typeName = roomTypeRow.typeName;
  roomTypeForm.description = isEmpty(roomTypeRow.description) ? '' : roomTypeRow.description;
  roomTypeForm.hourlyPrice = roomTypeRow.hourlyPrice;
  roomTypeForm.status = roomTypeRow.status;
  imageGalleryRef.value?.setImages(isEmpty(roomTypeRow.imageList) ? [] : roomTypeRow.imageList);
}

/**
 * 保存包厢类型。新建成功后再补传选中的图片。
 */
async function saveRoomType(): Promise<void> {
  if (isEmpty(roomTypeForm.typeName)) {
    ElMessage.warning('请填写名称');
    return;
  }
  const hourlyPriceNumber = Number(roomTypeForm.hourlyPrice);
  if (Number.isFinite(hourlyPriceNumber) !== true || hourlyPriceNumber <= 0) {
    ElMessage.warning('每小时价格必须大于0');
    return;
  }
  await runSaving(async () => {
    if (isEmpty(editingId.value)) {
      const createdRoomType = (await http.post(KtvApi.ROOM_TYPES, roomTypeForm)) as RoomTypeRow;
      editingId.value = createdRoomType.id;
      await imageGalleryRef.value?.uploadPending();
    } else {
      await http.put(KtvApi.roomType(editingId.value), roomTypeForm);
    }
    ElMessage.success('保存成功');
    visible.value = false;
    emit('saved');
  });
}
</script>
