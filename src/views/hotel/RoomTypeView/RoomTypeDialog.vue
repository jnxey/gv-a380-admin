<template>
  <el-dialog v-model="visible" :title="isEmpty(roomType) ? '新建房型' : '编辑房型'" width="720px">
    <el-form label-position="top">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="名称"><el-input v-model="roomTypeForm.typeName" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="每晚价格"><el-input v-model="roomTypeForm.price" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态">
            <el-select v-model="roomTypeForm.status" class="field-full">
              <el-option label="启用" :value="RecordStatus.ENABLED" />
              <el-option label="停用" :value="RecordStatus.DISABLED" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="床型">
            <el-input v-model="roomTypeForm.description.bedType" :maxlength="DetailDescriptionLimit.SHORT_MAX_LENGTH" placeholder="选填" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="大小">
            <el-input v-model="roomTypeForm.description.roomSize" :maxlength="DetailDescriptionLimit.SHORT_MAX_LENGTH" placeholder="选填" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="楼层">
            <el-input v-model="roomTypeForm.description.floorText" :maxlength="DetailDescriptionLimit.SHORT_MAX_LENGTH" placeholder="选填" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="人数">
            <el-input v-model="roomTypeForm.description.guestCount" :maxlength="DetailDescriptionLimit.SHORT_MAX_LENGTH" placeholder="选填" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="早餐">
            <el-input v-model="roomTypeForm.description.breakfast" :maxlength="DetailDescriptionLimit.SHORT_MAX_LENGTH" placeholder="选填" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="免费停车">
            <el-input v-model="roomTypeForm.description.freeParking" :maxlength="DetailDescriptionLimit.SHORT_MAX_LENGTH" placeholder="选填" />
          </el-form-item>
        </el-col>
        <el-col :span="24" />
        <el-col :span="12">
          <el-form-item label="预订须知">
            <el-input
              v-model="roomTypeForm.description.bookingNotice"
              type="textarea"
              :rows="4"
              :maxlength="DetailDescriptionLimit.MAX_LENGTH"
              show-word-limit
              placeholder="选填"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="图片">
            <ImageGalleryUpload ref="imageGalleryRef" :owner-id="editingId" :adapter="roomTypeImageAdapter" exceed-label="房型图片" />
          </el-form-item>
        </el-col>
      </el-row>
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
import { DetailDescriptionLimit, RecordStatus } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

export type RoomTypeImageView = GalleryImageView;

export interface RoomTypeDescription {
  bedType: string;
  roomSize: string;
  floorText: string;
  guestCount: string;
  breakfast: string;
  freeParking: string;
  bookingNotice: string;
}

export interface RoomTypeRow {
  id: string;
  typeName: string;
  description: RoomTypeDescription;
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
  description: emptyRoomTypeDescription(),
  price: '',
  status: RecordStatus.ENABLED as string
});

/**
 * 空的房型描述。
 */
function emptyRoomTypeDescription(): RoomTypeDescription {
  return {
    bedType: '',
    roomSize: '',
    floorText: '',
    guestCount: '',
    breakfast: '',
    freeParking: '',
    bookingNotice: ''
  };
}

/**
 * 读描述里的一段文字。没有时为空串。
 */
function readDescriptionText(description: RoomTypeDescription | null | undefined, fieldName: keyof RoomTypeDescription): string {
  if (isEmpty(description) || isEmpty(description[fieldName])) {
    return '';
  }
  return description[fieldName];
}

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
  }
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
    roomTypeForm.description = emptyRoomTypeDescription();
    roomTypeForm.price = '';
    roomTypeForm.status = RecordStatus.ENABLED;
    imageGalleryRef.value?.clearImages();
    return;
  }
  editingId.value = roomTypeRow.id;
  roomTypeForm.typeName = roomTypeRow.typeName;
  roomTypeForm.description = {
    bedType: readDescriptionText(roomTypeRow.description, 'bedType'),
    roomSize: readDescriptionText(roomTypeRow.description, 'roomSize'),
    floorText: readDescriptionText(roomTypeRow.description, 'floorText'),
    guestCount: readDescriptionText(roomTypeRow.description, 'guestCount'),
    breakfast: readDescriptionText(roomTypeRow.description, 'breakfast'),
    freeParking: readDescriptionText(roomTypeRow.description, 'freeParking'),
    bookingNotice: readDescriptionText(roomTypeRow.description, 'bookingNotice')
  };
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

<style scoped>
.field-full {
  width: 100%;
}
</style>
