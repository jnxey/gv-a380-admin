<template>
  <el-dialog v-model="visible" :title="isEmpty(shop) ? '新建门店' : '编辑门店'" width="720px">
    <el-form class="shop-form" label-position="top">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="编码"><el-input v-model="shopForm.shopCode" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="名称"><el-input v-model="shopForm.shopName" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="门店时区">
            <el-select v-model="shopForm.timeZone">
              <el-option v-for="timeZoneOption in timeZoneOptionList" :key="timeZoneOption.offset" :label="timeZoneOption.label" :value="timeZoneOption.offset" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="营业时间">
            <div class="shop-hours">
              <el-select v-model="shopForm.startTime" clearable placeholder="开始" @change="alignEndTime">
                <el-option v-for="businessHour in startTimeOptionList" :key="businessHour" :label="businessHour" :value="businessHour" />
              </el-select>
              <span class="shop-hours-split">到</span>
              <el-select v-model="shopForm.endTime" clearable placeholder="结束">
                <el-option v-for="businessHour in endTimeOptionList" :key="businessHour" :label="businessHour" :value="businessHour" />
              </el-select>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="位置">
            <div class="shop-location">
              <span class="shop-location-text">{{ locationLabel }}</span>
              <el-button @click="locationDialogVisible = true">地图选点</el-button>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="地址描述"><el-input v-model="shopForm.addressText" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="电话"><el-input v-model="shopForm.contactPhone" /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态">
            <el-select v-model="shopForm.status">
              <el-option label="启用" :value="RecordStatus.ENABLED" />
              <el-option label="停用" :value="RecordStatus.DISABLED" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
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
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button size="large" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" @click="saveShop">保存</el-button>
    </template>
  </el-dialog>
  <el-dialog v-model="previewVisible" title="图片预览" width="480px">
    <img class="shop-image-preview" :src="previewUrl" alt="" />
  </el-dialog>
  <ShopLocationDialog
    v-model="locationDialogVisible"
    :longitude="shopForm.longitude"
    :latitude="shopForm.latitude"
    @confirm="applyPickedLocation"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { UploadRequestOptions, UploadUserFile } from 'element-plus';
import { useRouter } from 'vue-router';
import { BeijingTimeZoneOffset, BusinessHourList, RecordStatus, ShopImageLimit, ShopImageMime, TimeZoneOptionList, timeZoneLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { limitImageWidth, replaceUploadRawFile } from '../../../utils/image';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import ShopLocationDialog from '../../ktv/ShopView/ShopLocationDialog.vue';

export interface ShopImageView {
  imageId: string;
  imageUrl: string;
}

export interface ShopBusinessHours {
  startTime: string;
  endTime: string;
}

export interface ShopAddressLocation {
  longitude: number | null;
  latitude: number | null;
  addressText: string;
}

export interface ShopRow {
  shopId: string;
  shopCode: string;
  shopName: string;
  address: string;
  contactPhone: string;
  status: string;
  timeZone: string;
  businessHours: ShopBusinessHours | null;
  shopAddress: ShopAddressLocation | null;
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
const locationDialogVisible = ref(false);
const shopForm = reactive({
  shopCode: '',
  shopName: '',
  timeZone: '',
  startTime: '',
  endTime: '',
  longitude: '',
  latitude: '',
  addressText: '',
  contactPhone: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 时区下拉。已保存但不在列表里的偏移，补到最前面。
 */
const timeZoneOptionList = computed(() => {
  const optionList = TimeZoneOptionList.map((timeZoneOption) => ({
    offset: timeZoneOption.offset,
    label: timeZoneLabel(timeZoneOption.offset),
  }));
  const knownTimeZone = TimeZoneOptionList.some((timeZoneOption) => timeZoneOption.offset === shopForm.timeZone);
  if (isEmpty(shopForm.timeZone) || knownTimeZone) {
    return optionList;
  }
  return [{ offset: shopForm.timeZone, label: shopForm.timeZone }, ...optionList];
});

/**
 * 已选经纬度。还没选点时显示未选择。
 */
const locationLabel = computed(() => {
  if (isEmpty(shopForm.longitude) || isEmpty(shopForm.latitude)) {
    return '未选择';
  }
  return `${shopForm.longitude}, ${shopForm.latitude}`;
});

/**
 * 营业时间选项。已保存的时间不在半点档里时，补到最前面。
 */
function businessHourOptionList(selectedTime: string): string[] {
  if (isEmpty(selectedTime) || BusinessHourList.some((businessHour) => businessHour === selectedTime)) {
    return [...BusinessHourList];
  }
  return [selectedTime, ...BusinessHourList];
}

const startTimeOptionList = computed(() => businessHourOptionList(shopForm.startTime));

/**
 * 结束时间只列出开始之后的档。已保存但不合法的结束时间仍留在最前面。
 */
const endTimeOptionList = computed(() => {
  if (isEmpty(shopForm.startTime)) {
    if (isEmpty(shopForm.endTime)) {
      return [];
    }
    return [shopForm.endTime];
  }
  const laterHourList = BusinessHourList.filter((businessHour) => businessHour > shopForm.startTime);
  if (isEmpty(shopForm.endTime) || laterHourList.some((businessHour) => businessHour === shopForm.endTime)) {
    return laterHourList;
  }
  return [shopForm.endTime, ...laterHourList];
});

/**
 * 开始改到不早于结束时，清空结束。
 */
function alignEndTime(): void {
  if (isEmpty(shopForm.endTime)) {
    return;
  }
  if (isEmpty(shopForm.startTime) || shopForm.endTime <= shopForm.startTime) {
    shopForm.endTime = '';
  }
}

/**
 * 营业时间必须两边都填，且结束要晚于开始。
 */
function businessHoursInvalid(): boolean {
  if (isEmpty(shopForm.startTime) || isEmpty(shopForm.endTime)) {
    return true;
  }
  return shopForm.endTime <= shopForm.startTime;
}

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
    shopForm.timeZone = BeijingTimeZoneOffset;
    shopForm.startTime = '';
    shopForm.endTime = '';
    shopForm.longitude = '';
    shopForm.latitude = '';
    shopForm.addressText = '';
    shopForm.contactPhone = '';
    shopForm.status = RecordStatus.ENABLED;
    shopImageFileList.value = [];
    return;
  }
  editingShopId.value = shopRow.shopId;
  shopForm.shopCode = shopRow.shopCode;
  shopForm.shopName = shopRow.shopName;
  shopForm.timeZone = isEmpty(shopRow.timeZone) ? BeijingTimeZoneOffset : shopRow.timeZone;
  shopForm.startTime = isEmpty(shopRow.businessHours) ? '' : shopRow.businessHours.startTime;
  shopForm.endTime = isEmpty(shopRow.businessHours) ? '' : shopRow.businessHours.endTime;
  shopForm.longitude = coordinateText(isEmpty(shopRow.shopAddress) ? null : shopRow.shopAddress.longitude);
  shopForm.latitude = coordinateText(isEmpty(shopRow.shopAddress) ? null : shopRow.shopAddress.latitude);
  shopForm.addressText = addressDescription(shopRow);
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
 * 把地图上选中的经纬度写回表单。有解析出的地址时，填进地址描述。
 */
function applyPickedLocation(longitude: string, latitude: string, addressText: string): void {
  shopForm.longitude = longitude;
  shopForm.latitude = latitude;
  if (isEmpty(addressText) !== true) {
    shopForm.addressText = addressText;
  }
}

/**
 * 经纬度显示成文字。没有坐标时留空。
 */
function coordinateText(coordinate: number | null): string {
  if (isEmpty(coordinate)) {
    return '';
  }
  return String(coordinate);
}

/**
 * 地址描述优先用 JSON。旧门店只有地址文本时，用那一列填上。
 */
function addressDescription(shopRow: ShopRow): string {
  if (isEmpty(shopRow.shopAddress) || isEmpty(shopRow.shopAddress.addressText)) {
    return isEmpty(shopRow.address) ? '' : shopRow.address;
  }
  return shopRow.shopAddress.addressText;
}

/**
 * 把表单收成保存请求。空的经纬度不传数字。
 */
function shopSaveBody(): Record<string, unknown> {
  return {
    shopCode: shopForm.shopCode,
    shopName: shopForm.shopName,
    contactPhone: shopForm.contactPhone,
    status: shopForm.status,
    timeZone: shopForm.timeZone,
    businessHours: {
      startTime: isEmpty(shopForm.startTime) ? '' : shopForm.startTime,
      endTime: isEmpty(shopForm.endTime) ? '' : shopForm.endTime,
    },
    shopAddress: {
      longitude: isEmpty(shopForm.longitude) ? null : Number(shopForm.longitude),
      latitude: isEmpty(shopForm.latitude) ? null : Number(shopForm.latitude),
      addressText: shopForm.addressText,
    },
  };
}

/**
 * 保存门店。新建后先刷新登录态，再上传选中的图片。
 */
async function saveShop(): Promise<void> {
  if (isEmpty(shopForm.timeZone)) {
    ElMessage.warning('请填写门店时区');
    return;
  }
  if (isEmpty(shopForm.startTime) || isEmpty(shopForm.endTime)) {
    ElMessage.warning('请填写营业时间');
    return;
  }
  if (businessHoursInvalid()) {
    ElMessage.warning('结束时间必须晚于开始时间');
    return;
  }
  if (isEmpty(shopForm.longitude) || isEmpty(shopForm.latitude)) {
    ElMessage.warning('请选择门店位置');
    return;
  }
  const shopBody = shopSaveBody();
  if (isEmpty(editingShopId.value)) {
    const createdShop = (await http.post('/admin/hotel/shops', shopBody)) as ShopRow;
    editingShopId.value = createdShop.shopId;
    sessionStore.menuLoaded = false;
    await sessionStore.loadSession(router);
    await uploadPendingShopImages(createdShop.shopId);
  } else {
    await http.put(`/admin/hotel/shops/${editingShopId.value}`, shopBody);
  }
  ElMessage.success('保存成功');
  visible.value = false;
  emit('saved');
}
</script>

<style scoped>
.shop-form :deep(.el-form-item__content > .el-select) {
  width: 100%;
}

.shop-image-add {
  font-size: 28px;
  line-height: 1;
  color: #909399;
}

.shop-hours {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.shop-hours :deep(.el-select) {
  flex: 1;
  min-width: 0;
}

.shop-hours-split {
  flex-shrink: 0;
  color: #667085;
}

.shop-location {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.shop-location-text {
  color: #344054;
  word-break: break-all;
}

.shop-image-full :deep(.el-upload--picture-card) {
  display: none;
}

.shop-image-preview {
  display: block;
  width: 100%;
}
</style>
