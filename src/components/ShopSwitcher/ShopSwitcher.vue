<template>
  <el-card v-if="showSwitcher" class="shop-switcher-card">
    <div class="shop-switcher">
      <AppIcon class="shop-switcher-icon" :icon-name="MenuIconName.KTV_SHOP" />
      <span class="shop-switcher-divider" aria-hidden="true"></span>
      <el-segmented v-model="selectedShopId" :options="shopOptionList" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppIcon from '../AppIcon/AppIcon.vue';
import { useSessionStore, type ShopOption } from '../../stores/session';
import { MenuIconName, ModuleCode } from '../../utils/constants';
import { isEmpty } from '../../utils/tools';

const route = useRoute();
const sessionStore = useSessionStore();

/**
 * 当前页面所属模块。没有声明时按核心模块处理，门店列表不按业务线裁剪。
 */
const currentModuleCode = computed(() => {
  const moduleCode = route.meta.moduleCode;
  if (typeof moduleCode !== 'string' || isEmpty(moduleCode)) {
    return ModuleCode.CORE;
  }
  return moduleCode;
});

/**
 * 当前页面可以切换的门店。
 */
const selectableShopList = computed(() => sessionStore.listShopsForModule(currentModuleCode.value));

/**
 * 有可选门店时就显示当前店。只有一家时分段里也是这一家。
 */
const showSwitcher = computed(() => selectableShopList.value.length > 0);

/**
 * 分段按钮的选项。
 */
const shopOptionList = computed(() => {
  return selectableShopList.value.map((shop) => {
    return {
      label: shopLabel(shop),
      value: shop.shopId,
    };
  });
});

/**
 * 当前选中的门店。改选后写入登录态，页面会按新门店重新加载。
 */
const selectedShopId = computed({
  get(): string {
    return sessionStore.currentShopId;
  },
  set(shopId: string): void {
    sessionStore.saveCurrentShopId(shopId);
  },
});

/**
 * 门店分段展示名称。
 */
function shopLabel(shop: ShopOption): string {
  return `${shop.shopName}（${shop.shopCode}）`;
}
</script>

<style scoped>
.shop-switcher-card {
  margin-bottom: 12px;
}

.shop-switcher {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shop-switcher-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.shop-switcher-divider {
  width: 1px;
  height: 20px;
  flex-shrink: 0;
  background: #e6e8ec;
}

.shop-switcher-card :deep(.el-segmented) {
  --el-segmented-bg-color: #f0f2f5;
  --el-segmented-item-selected-bg-color: var(--el-color-primary);
  --el-segmented-item-selected-color: #ffffff;
  --el-segmented-color: #303133;
  --el-border-radius-base: 8px;
  width: auto;
}

.shop-switcher-card :deep(.el-segmented__item) {
  font-weight: 600;
}
</style>
