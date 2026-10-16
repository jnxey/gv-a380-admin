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
          <div class="shop-foot">
            <el-tag :type="shopRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
              {{ statusLabel(shopRow.status) }}
            </el-tag>
            <el-button v-if="canSave" link type="primary" @click="openEdit(shopRow)">编辑</el-button>
          </div>
        </div>
      </article>
    </div>
    <ShopDialog v-model="dialogVisible" :shop="editingShop" @saved="loadShops" />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import ShopDialog, { type ShopRow } from './ShopDialog.vue';

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.KTV_SHOP_SAVE);
const shopList = ref<ShopRow[]>([]);
const dialogVisible = ref(false);
const editingShop = ref<ShopRow | null>(null);

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
 * 查询已绑定的 KTV 门店。
 */
async function loadShops(): Promise<void> {
  shopList.value = (await http.get('/admin/ktv/shops')) as ShopRow[];
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

.shop-empty {
  margin-top: 16px;
  color: #909399;
}
</style>
