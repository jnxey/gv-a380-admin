<template>
  <el-dialog v-model="visible" :title="isEmpty(shop) ? '新建门店' : '编辑门店'" width="720px">
    <el-form class="shop-form" label-position="top">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="编码">
            <el-input v-model="shopForm.shopCode" :disabled="isEmpty(editingShopId) !== true" placeholder="保存后不可修改" />
          </el-form-item>
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
            <div v-if="isOvernightBusinessHours" class="shop-hours-tip">结束早于开始，按跨天营业到次日</div>
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
            <ImageGalleryUpload
              ref="imageGalleryRef"
              :owner-id="editingShopId"
              :adapter="shopImageAdapter"
              exceed-label="门店图片"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button size="large" :disabled="saving" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" :loading="saving" @click="saveShop">保存</el-button>
    </template>
  </el-dialog>
  <ShopLocationDialog
    v-model="locationDialogVisible"
    :longitude="shopForm.longitude"
    :latitude="shopForm.latitude"
    @confirm="applyPickedLocation"
  />
</template>

<script setup lang="ts">
import { HotelApi } from '../../../api/hotel';
import ImageGalleryUpload, { type GalleryImageView, type ImageGalleryAdapter } from '../../../components/ImageGalleryUpload/ImageGalleryUpload.vue';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { useSaving } from '../../../hooks/saving';
import { BeijingTimeZoneOffset, BusinessHourList, RecordStatus, TimeZoneOptionList, timeZoneLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import ShopLocationDialog from './ShopLocationDialog.vue';

export type ShopImageView = GalleryImageView;

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

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  shop: ShopRow | null;
}>();
const emit = defineEmits<{
  saved: [];
}>();

const router = useRouter();
const sessionStore = useSessionStore();
const editingShopId = ref('');
const imageGalleryRef = ref<InstanceType<typeof ImageGalleryUpload> | null>(null);
const locationDialogVisible = ref(false);
const { saving, runSaving } = useSaving();
/**
 * 门店图片的上传、删除和排序。
 */
const shopImageAdapter: ImageGalleryAdapter = {
  async upload(ownerId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return (await http.post(HotelApi.shopImages(ownerId), formData)) as GalleryImageView;
  },
  async remove(ownerId, imageId) {
    await http.delete(HotelApi.shopImage(ownerId, imageId));
  },
  async sort(ownerId, imageIdList) {
    await http.post(HotelApi.shopImagesSort(ownerId), { idList: imageIdList });
  },
};


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
 * 结束时间可早于开始（跨天），只排除与开始相同的档。已保存但不在半点档里的结束时间仍留在最前面。
 */
const endTimeOptionList = computed(() => {
  if (isEmpty(shopForm.startTime)) {
    return businessHourOptionList(shopForm.endTime);
  }
  const optionList = BusinessHourList.filter((businessHour) => businessHour !== shopForm.startTime);
  if (isEmpty(shopForm.endTime) || optionList.some((businessHour) => businessHour === shopForm.endTime)) {
    return optionList;
  }
  if (shopForm.endTime === shopForm.startTime) {
    return optionList;
  }
  return [shopForm.endTime, ...optionList];
});

/**
 * 结束早于开始时按跨天营业。
 */
const isOvernightBusinessHours = computed(() => {
  if (isEmpty(shopForm.startTime) || isEmpty(shopForm.endTime)) {
    return false;
  }
  return shopForm.endTime < shopForm.startTime;
});

/**
 * 开始改成与结束相同时，清空结束。
 */
function alignEndTime(): void {
  if (isEmpty(shopForm.endTime)) {
    return;
  }
  if (isEmpty(shopForm.startTime) !== true && shopForm.endTime === shopForm.startTime) {
    shopForm.endTime = '';
  }
}

/**
 * 营业时间必须两边都填，且开始和结束不能相同。
 */
function businessHoursInvalid(): boolean {
  if (isEmpty(shopForm.startTime) || isEmpty(shopForm.endTime)) {
    return true;
  }
  return shopForm.endTime === shopForm.startTime;
}

/**
 * 打开时按传入的门店填表。新建时清空。
 */
watch(visible, async (opened) => {
  if (opened !== true) {
    return;
  }
  await nextTick();
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
    imageGalleryRef.value?.clearImages();
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
  imageGalleryRef.value?.setImages(isEmpty(shopRow.imageList) ? [] : shopRow.imageList);
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
    ElMessage.warning('结束时间不能与开始时间相同');
    return;
  }
  if (isEmpty(shopForm.longitude) || isEmpty(shopForm.latitude)) {
    ElMessage.warning('请选择门店位置');
    return;
  }
  await runSaving(async () => {
    const shopBody = shopSaveBody();
    if (isEmpty(editingShopId.value)) {
      const createdShop = (await http.post(HotelApi.SHOPS, shopBody)) as ShopRow;
      editingShopId.value = createdShop.shopId;
      sessionStore.menuLoaded = false;
      await sessionStore.loadSession(router);
      await imageGalleryRef.value?.uploadPending();
    } else {
      await http.put(HotelApi.shop(editingShopId.value), shopBody);
    }
    ElMessage.success('保存成功');
    visible.value = false;
    emit('saved');
  });
}
</script>

<style scoped>
.shop-form :deep(.el-form-item__content > .el-select) {
  width: 100%;
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

.shop-hours-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 18px;
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

</style>
