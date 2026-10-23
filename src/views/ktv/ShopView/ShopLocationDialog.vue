<template>
  <el-dialog v-model="visible" title="选择位置" width="720px" @opened="showMap" @closed="clearMap">
    <div ref="mapElement" class="shop-location-map"></div>
    <div class="shop-location-picked">{{ pickedLocationText }}</div>
    <template #footer>
      <el-button size="large" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" :loading="confirming" @click="confirmLocation">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { MapApi } from '../../../api/map';
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BeijingLocation } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  longitude: string;
  latitude: string;
}>();
const emit = defineEmits<{
  confirm: [longitude: string, latitude: string, addressText: string];
}>();

const mapElement = ref<HTMLElement | null>(null);
const pickedLongitude = ref('');
const pickedLatitude = ref('');
const confirming = ref(false);
let locationMap: L.Map | null = null;
let locationMarker: L.CircleMarker | null = null;
let locationRequestId = 0;

const pickedLocationText = computed(() => {
  if (isEmpty(pickedLongitude.value) || isEmpty(pickedLatitude.value)) {
    return '在地图上点击选择位置';
  }
  return `${pickedLongitude.value}, ${pickedLatitude.value}`;
});

/**
 * 打开地图。已有坐标就居中并放标记，否则定位到当前位置。
 */
function showMap(): void {
  if (isEmpty(mapElement.value)) {
    return;
  }
  clearMap();
  const hasPoint = isEmpty(props.longitude) !== true && isEmpty(props.latitude) !== true;
  const latitude = hasPoint ? Number(props.latitude) : BeijingLocation.LATITUDE;
  const longitude = hasPoint ? Number(props.longitude) : BeijingLocation.LONGITUDE;
  mountMap(latitude, longitude, hasPoint ? 15 : 11);
  if (hasPoint) {
    placeMarker(latitude, longitude);
    return;
  }
  locateCurrentPosition();
}

/**
 * 创建地图并接上点击选点。瓦片直连 MapTiler。
 */
function mountMap(latitude: number, longitude: number, zoom: number): void {
  if (isEmpty(mapElement.value)) {
    return;
  }
  locationMap = L.map(mapElement.value, { minZoom: 3, maxZoom: 18 }).setView([latitude, longitude], zoom);
  L.tileLayer(MapApi.TILE, {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(locationMap);
  locationMap.on('click', (event: L.LeafletMouseEvent) => {
    placeMarker(event.latlng.lat, event.latlng.lng);
  });
  locationMap.invalidateSize();
}

/**
 * 没有已存坐标时，用浏览器当前位置并写入选中点。失败则改用北京坐标。
 */
function locateCurrentPosition(): void {
  const requestId = locationRequestId;
  if (isEmpty(navigator.geolocation)) {
    useBeijingPosition();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (requestId !== locationRequestId || locationMap === null) {
        return;
      }
      locationMap.setView([position.coords.latitude, position.coords.longitude], 15);
      placeMarker(position.coords.latitude, position.coords.longitude);
    },
    () => {
      if (requestId !== locationRequestId || locationMap === null) {
        return;
      }
      useBeijingPosition();
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
  );
}

/**
 * 定位失败时居中北京，并立刻写入选中点。
 */
function useBeijingPosition(): void {
  if (locationMap === null) {
    return;
  }
  locationMap.setView([BeijingLocation.LATITUDE, BeijingLocation.LONGITUDE], 15);
  placeMarker(BeijingLocation.LATITUDE, BeijingLocation.LONGITUDE);
}

/**
 * 在点击处放下或移动标记，并记下经纬度。
 */
function placeMarker(latitude: number, longitude: number): void {
  if (locationMap === null) {
    return;
  }
  if (locationMarker === null) {
    locationMarker = L.circleMarker([latitude, longitude], {
      radius: 8,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 1,
    }).addTo(locationMap);
  } else {
    locationMarker.setLatLng([latitude, longitude]);
  }
  pickedLatitude.value = latitude.toFixed(6);
  pickedLongitude.value = longitude.toFixed(6);
}

/**
 * 把逆地理 URL 模板里的 {lng} {lat} 换成当前选中点。
 */
function buildReverseUrl(longitude: string, latitude: string): string {
  return MapApi.REVERSE.replaceAll('{lng}', longitude).replaceAll('{lat}', latitude);
}

/**
 * 从 MapTiler 逆地理 JSON 取出地址文字。没有 features 时返回空串。
 */
function readMapTilerPlaceName(body: unknown): string {
  if (body === null || typeof body !== 'object') {
    return '';
  }
  const featureList = (body as { features?: unknown }).features;
  if (Array.isArray(featureList) !== true || featureList.length === 0) {
    return '';
  }
  const firstFeature = featureList[0];
  if (firstFeature === null || typeof firstFeature !== 'object') {
    return '';
  }
  const placeName = (firstFeature as { place_name?: unknown }).place_name;
  if (typeof placeName !== 'string') {
    return '';
  }
  const trimmedPlaceName = placeName.trim();
  if (isEmpty(trimmedPlaceName)) {
    return '';
  }
  return trimmedPlaceName;
}

/**
 * 确认位置后解析地址，再把经纬度和地址交回表单。
 */
async function confirmLocation(): Promise<void> {
  if (isEmpty(pickedLongitude.value) || isEmpty(pickedLatitude.value)) {
    ElMessage.warning('请在地图上选择位置');
    return;
  }
  if (confirming.value === true) {
    return;
  }
  confirming.value = true;
  try {
    const reverseUrl = buildReverseUrl(pickedLongitude.value, pickedLatitude.value);
    const response = await fetch(reverseUrl);
    if (response.ok !== true) {
      throw new Error('reverse failed');
    }
    const body = (await response.json()) as unknown;
    const addressText = readMapTilerPlaceName(body);
    emit('confirm', pickedLongitude.value, pickedLatitude.value, addressText);
    visible.value = false;
  } catch {
    ElMessage.error('地址解析失败，请稍后重试');
  } finally {
    confirming.value = false;
  }
}

/**
 * 关闭弹窗后拆掉地图，避免下次打开叠一层。
 */
function clearMap(): void {
  locationRequestId += 1;
  if (locationMap !== null) {
    locationMap.remove();
  }
  locationMap = null;
  locationMarker = null;
  pickedLongitude.value = '';
  pickedLatitude.value = '';
}
</script>

<style scoped>
.shop-location-map {
  height: 360px;
  border-radius: 8px;
}

.shop-location-picked {
  margin-top: 8px;
  font-size: 13px;
  line-height: 20px;
  color: #344054;
}
</style>
