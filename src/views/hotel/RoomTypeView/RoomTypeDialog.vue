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
        <ImageGalleryUpload
          ref="imageGalleryRef"
          :owner-id="editingId"
          :adapter="roomTypeImageAdapter"
          exceed-label="房型图片"
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
import { HotelApi } from '../../../api/hotel';
import { nextTick, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import ImageGalleryUpload, { type GalleryImageView, type ImageGalleryAdapter } from '../../../components/ImageGalleryUpload/ImageGalleryUpload.vue';
import { useSaving } from '../../../hooks/saving';
import { RecordStatus } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

export type RoomTypeImageView = GalleryImageView;

export interface RoomTypeRow {
  id: string;
  typeName: string;
  price: string;
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
  price: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 房型图片的上传、删除和排序。
 */
const roomTypeImageAdapter: ImageGalleryAdapter = {
  async upload(ownerId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return (await http.post(HotelApi.roomTypeImages(ownerId), formData)) as GalleryImageView;
  },
  async remove(ownerId, imageId) {
    await http.delete(HotelApi.roomTypeImage(ownerId, imageId));
  },
  async sort(ownerId, imageIdList) {
    await http.post(HotelApi.roomTypeImagesSort(ownerId), { idList: imageIdList });
  },
};

/**
 * 打开时按传入的房型填表。新建时清空。
 */
watch(visible, async (opened) => {
  if (opened !== true) {
    return;
  }
  await nextTick();
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
    imageGalleryRef.value?.clearImages();
    return;
  }
  editingId.value = roomTypeRow.id;
  roomTypeForm.typeName = roomTypeRow.typeName;
  roomTypeForm.price = roomTypeRow.price;
  roomTypeForm.status = roomTypeRow.status;
  imageGalleryRef.value?.setImages(isEmpty(roomTypeRow.imageList) ? [] : roomTypeRow.imageList);
}

/**
 * 保存房型。新建成功后再补传选中的图片。
 */
async function saveRoomType(): Promise<void> {
  if (isEmpty(roomTypeForm.typeName)) {
    ElMessage.warning('请填写名称');
    return;
  }
  const priceNumber = Number(roomTypeForm.price);
  if (Number.isFinite(priceNumber) !== true || priceNumber <= 0) {
    ElMessage.warning('每晚价格必须大于0');
    return;
  }
  await runSaving(async () => {
    if (isEmpty(editingId.value)) {
      const createdRoomType = (await http.post(HotelApi.ROOM_TYPES, roomTypeForm)) as RoomTypeRow;
      editingId.value = createdRoomType.id;
      await imageGalleryRef.value?.uploadPending();
    } else {
      await http.put(HotelApi.roomType(editingId.value), roomTypeForm);
    }
    ElMessage.success('保存成功');
    visible.value = false;
    emit('saved');
  });
}
</script>
