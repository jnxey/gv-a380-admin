<template>
  <el-card>
    <div v-if="isEmpty(shopList) && canSave !== true" class="shop-empty">暂无数据</div>
    <div v-else class="shop-grid">
      <button v-if="canSave" type="button" class="shop-card shop-create" @click="openCreate">
        <span class="shop-create-plus">+</span>
        <span>新建门店</span>
      </button>
      <article v-for="shopRow in shopList" :key="shopRow.shopId" class="shop-card">
        <div class="shop-cover">
          <img v-if="!isEmpty(coverImageUrl(shopRow))" :src="coverImageUrl(shopRow)" alt="" />
          <span v-else class="shop-cover-empty">暂无图片</span>
        </div>
        <div class="shop-body">
          <div class="shop-name">{{ shopRow.shopName }}</div>
          <div class="shop-meta">
            {{ shopRow.shopCode }}<template v-if="!isEmpty(shopRow.contactPhone)"> · {{ shopRow.contactPhone }}</template>
          </div>
          <div class="shop-address">{{ shopRow.address }}</div>
          <div v-if="!isEmpty(shopRow.timeZone)" class="shop-address">{{ timeZoneLabel(shopRow.timeZone) }}</div>
          <div v-if="!isEmpty(shopBusinessHoursText(shopRow))" class="shop-address">{{ shopBusinessHoursText(shopRow) }}</div>
          <div class="shop-foot">
            <el-tag :type="shopRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
              {{ statusLabel(shopRow.status) }}
            </el-tag>
            <div class="shop-actions">
              <el-button link type="primary" @click="openPayQr(shopRow)">收款码</el-button>
              <el-button v-if="canSave" link type="primary" @click="openEdit(shopRow)">编辑</el-button>
            </div>
          </div>
        </div>
      </article>
    </div>
    <ShopDialog v-model="dialogVisible" :shop="editingShop" @saved="loadShops" />
    <el-dialog v-model="payQrVisible" title="门店收款二维码" width="360px">
      <div class="shop-pay-qr-dialog">
        <div class="shop-pay-qr" :style="{ backgroundColor: ShopPayQr.BACKGROUND_COLOR }">
          <div class="shop-pay-qr-name">{{ payQrShopName }}</div>
          <div class="shop-pay-qr-code">
            <img v-if="!isEmpty(payQrImageUrl)" :src="payQrImageUrl" :width="ShopPayQr.IMAGE_WIDTH" :height="ShopPayQr.IMAGE_WIDTH" alt="" />
            <span class="shop-pay-qr-logo" :style="{ width: `${ShopPayQr.LOGO_SIZE}px`, height: `${ShopPayQr.LOGO_SIZE}px` }">
              <img :src="ShopPayQr.LOGO_URL" alt="" />
            </span>
          </div>
          <div class="shop-pay-qr-hint">{{ ShopPayQr.HINT }}</div>
        </div>
        <el-button class="shop-pay-qr-download" type="primary" round @click="downloadPayQrPoster">下载</el-button>
      </div>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { HotelApi } from '../../../api/hotel';
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import QRCode from 'qrcode';
import { PermissionCode, RecordStatus, ShopPayQr, statusLabel, timeZoneLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import ShopDialog, { type ShopRow } from './ShopDialog.vue';

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.HOTEL_SHOP_SAVE);
const shopList = ref<ShopRow[]>([]);
const dialogVisible = ref(false);
const editingShop = ref<ShopRow | null>(null);
const payQrVisible = ref(false);
const payQrShopName = ref('');
const payQrImageUrl = ref('');
const payQrFileName = ref('');

/**
 * 营业时间显示成开始到结束。没有时段时返回空字符串。
 */
function shopBusinessHoursText(shopRow: ShopRow): string {
  if (isEmpty(shopRow.businessHours)) {
    return '';
  }
  const startTime = shopRow.businessHours.startTime;
  const endTime = shopRow.businessHours.endTime;
  if (isEmpty(startTime) && isEmpty(endTime)) {
    return '';
  }
  return `${startTime} - ${endTime}`;
}

/**
 * 封面用第一张门店图片。没有图片时返回空字符串。
 */
function coverImageUrl(shopRow: ShopRow): string {
  if (isEmpty(shopRow.imageList)) {
    return '';
  }
  return shopRow.imageList[0].imageUrl;
}

/**
 * 查询已绑定的酒店门店。
 */
async function loadShops(): Promise<void> {
  shopList.value = (await http.get(HotelApi.SHOPS)) as ShopRow[];
}

/**
 * 打开新建弹窗。
 */
function openCreate(): void {
  editingShop.value = null;
  dialogVisible.value = true;
}

/**
 * 打开编辑弹窗。
 */
function openEdit(shopRow: ShopRow): void {
  editingShop.value = shopRow;
  dialogVisible.value = true;
}

/**
 * 拼出门店收款二维码文案。前缀加门店编码。
 */
function buildShopPayQrText(shopCode: string): string {
  return `${ShopPayQr.PREFIX}${shopCode}`;
}

/**
 * 按门店编码生成收款二维码。编码为空时只提示。
 */
async function openPayQr(shopRow: ShopRow): Promise<void> {
  const shopCode = shopRow.shopCode.trim();
  if (isEmpty(shopCode)) {
    ElMessage.warning('请填写门店编码');
    return;
  }
  const payQrContent = buildShopPayQrText(shopCode);
  const payQrDataUrl = await QRCode.toDataURL(payQrContent, { width: ShopPayQr.IMAGE_WIDTH, margin: ShopPayQr.MARGIN, errorCorrectionLevel: ShopPayQr.ERROR_CORRECTION_LEVEL });
  payQrShopName.value = shopRow.shopName;
  payQrImageUrl.value = payQrDataUrl;
  payQrFileName.value = payQrContent;
  payQrVisible.value = true;
}

/**
 * 读一张海报用图。地址打不开时拒绝。
 */
function loadPayQrPosterImage(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const posterImage = new Image();
    posterImage.onload = () => resolve(posterImage);
    posterImage.onerror = () => reject(new Error(imageUrl));
    posterImage.src = imageUrl;
  });
}

/**
 * 把当前紫色海报画成图片并保存。文件名是 GP_ 加门店编码，画面不含下载按钮。
 */
async function downloadPayQrPoster(): Promise<void> {
  if (isEmpty(payQrImageUrl.value) || isEmpty(payQrFileName.value)) {
    return;
  }
  // 步骤 1：读出二维码和中间图标。
  const qrImage = await loadPayQrPosterImage(payQrImageUrl.value);
  const logoImage = await loadPayQrPosterImage(ShopPayQr.LOGO_URL);
  const posterScale = ShopPayQr.POSTER_SCALE;
  const posterWidth = 320 * posterScale;
  const horizontalPadding = 20 * posterScale;
  const topPadding = 28 * posterScale;
  const bottomPadding = 24 * posterScale;
  const blockGap = 16 * posterScale;
  const nameFontSize = 20 * posterScale;
  const hintFontSize = 14 * posterScale;
  const qrEdge = ShopPayQr.IMAGE_WIDTH * posterScale;
  const qrCardPadding = 12 * posterScale;
  const logoWidth = ShopPayQr.LOGO_SIZE * posterScale;
  const logoHeight = logoWidth;
  const textMaxWidth = posterWidth - horizontalPadding * 2;
  const posterFont = '"Microsoft YaHei", sans-serif';
  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  if (measureContext === null) {
    return;
  }
  // 步骤 2：按宽度把店名折成多行，用来算海报高度。
  measureContext.font = `${nameFontSize}px ${posterFont}`;
  const shopNameLineList: string[] = [];
  let currentShopNameLine = '';
  const shopNameText = payQrShopName.value;
  for (const shopNameCharacter of shopNameText) {
    const nextShopNameLine = `${currentShopNameLine}${shopNameCharacter}`;
    if (measureContext.measureText(nextShopNameLine).width > textMaxWidth && currentShopNameLine !== '') {
      shopNameLineList.push(currentShopNameLine);
      currentShopNameLine = shopNameCharacter;
    } else {
      currentShopNameLine = nextShopNameLine;
    }
  }
  if (currentShopNameLine !== '') {
    shopNameLineList.push(currentShopNameLine);
  }
  if (shopNameLineList.length === 0) {
    shopNameLineList.push('');
  }
  const nameLineHeight = Math.round(nameFontSize * 1.3);
  const nameBlockHeight = shopNameLineList.length * nameLineHeight;
  const qrCardEdge = qrEdge + qrCardPadding * 2;
  const posterHeight = topPadding + nameBlockHeight + blockGap + qrCardEdge + blockGap + hintFontSize + bottomPadding;
  // 步骤 3：铺紫底，写下店名、白底二维码、中间图标和底部提示。
  const posterCanvas = document.createElement('canvas');
  posterCanvas.width = posterWidth;
  posterCanvas.height = posterHeight;
  const posterContext = posterCanvas.getContext('2d');
  if (posterContext === null) {
    return;
  }
  posterContext.fillStyle = ShopPayQr.BACKGROUND_COLOR;
  posterContext.fillRect(0, 0, posterWidth, posterHeight);
  posterContext.fillStyle = '#ffffff';
  posterContext.textAlign = 'center';
  posterContext.textBaseline = 'top';
  posterContext.font = `600 ${nameFontSize}px ${posterFont}`;
  let textTop = topPadding;
  for (const shopNameLine of shopNameLineList) {
    posterContext.fillText(shopNameLine, posterWidth / 2, textTop);
    textTop += nameLineHeight;
  }
  const qrCardLeft = (posterWidth - qrCardEdge) / 2;
  const qrCardTop = topPadding + nameBlockHeight + blockGap;
  posterContext.fillStyle = '#ffffff';
  posterContext.beginPath();
  posterContext.roundRect(qrCardLeft, qrCardTop, qrCardEdge, qrCardEdge, 12 * posterScale);
  posterContext.fill();
  posterContext.drawImage(qrImage, qrCardLeft + qrCardPadding, qrCardTop + qrCardPadding, qrEdge, qrEdge);
  const logoLeft = (posterWidth - logoWidth) / 2;
  const logoTop = qrCardTop + (qrCardEdge - logoHeight) / 2;
  const logoRim = 2 * posterScale;
  posterContext.fillStyle = '#ffffff';
  posterContext.beginPath();
  posterContext.roundRect(logoLeft - logoRim, logoTop - logoRim, logoWidth + logoRim * 2, logoHeight + logoRim * 2, 6 * posterScale);
  posterContext.fill();
  posterContext.drawImage(logoImage, logoLeft, logoTop, logoWidth, logoHeight);
  posterContext.fillStyle = '#ffffff';
  posterContext.font = `${hintFontSize}px ${posterFont}`;
  posterContext.fillText(ShopPayQr.HINT, posterWidth / 2, qrCardTop + qrCardEdge + blockGap);
  // 步骤 4：按 GP_ 加门店编码保存。
  const downloadLink = document.createElement('a');
  downloadLink.href = posterCanvas.toDataURL('image/png');
  downloadLink.download = `${payQrFileName.value}${ShopPayQr.FILE_EXTENSION}`;
  downloadLink.click();
}

onMounted(() => {
  void loadShops();
});
</script>

<style scoped>
.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.shop-card {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.shop-create {
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

.shop-create-plus {
  font-size: 32px;
  line-height: 1;
  color: #98a2b3;
}

.shop-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  background: #f4f6f8;
}

.shop-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shop-cover-empty {
  font-size: 13px;
  color: #909399;
}

.shop-body {
  padding: 12px;
}

.shop-name {
  font-size: 16px;
  font-weight: 600;
  color: #1c2434;
  word-break: break-word;
}

.shop-meta,
.shop-address {
  margin-top: 4px;
  font-size: 13px;
  color: #667085;
  word-break: break-word;
}

.shop-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.shop-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shop-pay-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 28px 20px 24px;
  border-radius: 16px;
}

.shop-pay-qr-name,
.shop-pay-qr-hint {
  color: #ffffff;
  text-align: center;
  word-break: break-word;
}

.shop-pay-qr-name {
  font-size: 20px;
  font-weight: 600;
}

.shop-pay-qr-hint {
  font-size: 14px;
}

.shop-pay-qr-code {
  position: relative;
  padding: 12px;
  background: #ffffff;
  border-radius: 12px;
}

.shop-pay-qr-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shop-pay-qr-download {
  width: 100%;
}

.shop-pay-qr-logo {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  padding: 2px;
  background: #ffffff;
  border-radius: 6px;
  transform: translate(-50%, -50%);
}

.shop-pay-qr-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shop-empty {
  margin-top: 16px;
  color: #909399;
}
</style>
