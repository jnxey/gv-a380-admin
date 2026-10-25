<template>
  <el-dialog v-model="visible" :title="isEmpty(roomType) ? '新建类型' : '编辑类型'" width="720px">
    <el-form label-position="top">
      <div class="dialog-section">
        <div class="dialog-section-title">基本信息</div>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="名称"><el-input v-model="roomTypeForm.typeName" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="每小时价格"><el-input v-model="roomTypeForm.hourlyPrice" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-radio-group v-model="roomTypeForm.status">
                <el-radio :value="RecordStatus.ENABLED">启用</el-radio>
                <el-radio :value="RecordStatus.DISABLED">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <div class="dialog-section">
        <div class="dialog-section-title">积分抵扣</div>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="积分可抵扣金额">
              <el-input v-model="roomTypeForm.pointDeductAmount" placeholder="不能大于每小时价格" />
              <p v-if="showPointDeductZeroHint(roomTypeForm.pointDeductAmount)" class="field-hint">为 0 时不可抵扣</p>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="抵扣积分数量">
              <el-input v-model="roomTypeForm.pointDeductPoints" placeholder="0 表示不可抵扣" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <div class="dialog-section">
        <div class="dialog-section-title">预订说明</div>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="预订简述">
              <el-input
                v-model="roomTypeForm.description.bookingSummary"
                type="textarea"
                :rows="2"
                :maxlength="DetailDescriptionLimit.MAX_LENGTH"
                show-word-limit
                placeholder="选填"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="退订规则">
              <el-input
                v-model="roomTypeForm.description.cancelRule"
                type="textarea"
                :rows="2"
                :maxlength="DetailDescriptionLimit.MAX_LENGTH"
                show-word-limit
                placeholder="选填"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="预订须知">
              <el-input
                v-model="roomTypeForm.description.bookingNotice"
                type="textarea"
                :rows="2"
                :maxlength="DetailDescriptionLimit.MAX_LENGTH"
                show-word-limit
                placeholder="选填"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <div class="dialog-section">
        <div class="dialog-section-title">图片</div>
        <el-form-item>
          <ImageGalleryUpload ref="imageGalleryRef" :owner-id="editingId" :adapter="roomTypeImageAdapter" exceed-label="包厢类型图片" />
        </el-form-item>
      </div>
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
import { formatMoney, isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

export type RoomTypeImageView = GalleryImageView;

export interface RoomTypeDescription {
  bookingSummary: string;
  cancelRule: string;
  bookingNotice: string;
}

export interface RoomTypeRow {
  id: string;
  typeName: string;
  description: RoomTypeDescription;
  hourlyPrice: string;
  pointDeductAmount: string;
  pointDeductPoints: number;
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
  hourlyPrice: '',
  pointDeductAmount: '0',
  pointDeductPoints: '0',
  status: RecordStatus.ENABLED as string
});

/**
 * 空的包厢描述。
 */
function emptyRoomTypeDescription(): RoomTypeDescription {
  return {
    bookingSummary: '',
    cancelRule: '',
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
  }
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
    roomTypeForm.description = emptyRoomTypeDescription();
    roomTypeForm.hourlyPrice = '';
    roomTypeForm.pointDeductAmount = '0';
    roomTypeForm.pointDeductPoints = '0';
    roomTypeForm.status = RecordStatus.ENABLED;
    imageGalleryRef.value?.clearImages();
    return;
  }
  editingId.value = roomTypeRow.id;
  roomTypeForm.typeName = roomTypeRow.typeName;
  roomTypeForm.description = {
    bookingSummary: readDescriptionText(roomTypeRow.description, 'bookingSummary'),
    cancelRule: readDescriptionText(roomTypeRow.description, 'cancelRule'),
    bookingNotice: readDescriptionText(roomTypeRow.description, 'bookingNotice')
  };
  roomTypeForm.hourlyPrice = formatMoney(roomTypeRow.hourlyPrice);
  roomTypeForm.pointDeductAmount = isEmpty(roomTypeRow.pointDeductAmount) ? '0' : formatMoney(roomTypeRow.pointDeductAmount);
  roomTypeForm.pointDeductPoints = isEmpty(roomTypeRow.pointDeductPoints) ? '0' : String(roomTypeRow.pointDeductPoints);
  roomTypeForm.status = roomTypeRow.status;
  imageGalleryRef.value?.setImages(isEmpty(roomTypeRow.imageList) ? [] : roomTypeRow.imageList);
}

/**
 * 金额为空或 0 时，提示当前不能用积分抵扣。
 */
function showPointDeductZeroHint(amountText: string): boolean {
  if (isEmpty(amountText)) {
    return true;
  }
  const amountNumber = Number(amountText);
  return Number.isFinite(amountNumber) === true && amountNumber === 0;
}

/**
 * 积分可抵扣金额和积分数量同时为 0，或同时有效，且金额不超过单位价格。
 */
function acceptPointDeduct(unitPriceText: string, amountText: string, pointsText: string, priceLabel: string): boolean {
  const amountNumber = isEmpty(amountText) ? 0 : Number(amountText);
  const pointsNumber = isEmpty(pointsText) ? 0 : Number(pointsText);
  const unitPriceNumber = Number(unitPriceText);
  if (Number.isFinite(amountNumber) !== true || amountNumber < 0 || Number.isInteger(pointsNumber) !== true || pointsNumber < 0) {
    ElMessage.warning('积分抵扣不正确');
    return false;
  }
  const amountIsZero = amountNumber === 0;
  const pointsIsZero = pointsNumber === 0;
  if (amountIsZero !== pointsIsZero) {
    ElMessage.warning('积分可抵扣金额和抵扣积分数量需要同时填写');
    return false;
  }
  if (amountIsZero !== true && (Number.isFinite(unitPriceNumber) !== true || amountNumber > unitPriceNumber)) {
    ElMessage.warning(`积分可抵扣金额不能大于${priceLabel}`);
    return false;
  }
  return true;
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
  if (acceptPointDeduct(roomTypeForm.hourlyPrice, roomTypeForm.pointDeductAmount, roomTypeForm.pointDeductPoints, '每小时价格') !== true) {
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

<style scoped>
.dialog-section {
  margin-bottom: 8px;
  padding: 10px 12px;
  border: 1px solid #e6e8ec;
  border-radius: 10px;
  background: #f8fafc;
}

.dialog-section:last-child {
  margin-bottom: 0;
}

.dialog-section-title {
  margin-bottom: 8px;
  color: #667085;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.dialog-section :deep(.el-form-item) {
  margin-bottom: 0;
}

.dialog-section :deep(.el-row) {
  row-gap: 8px;
}

.field-hint {
  margin: 4px 0 0;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}
</style>
