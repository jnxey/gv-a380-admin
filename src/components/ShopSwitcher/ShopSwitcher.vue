<template>
  <el-dropdown v-if="showSwitcher" trigger="click" @command="onShopCommand">
    <el-button class="shop-switcher" type="default" text>{{ currentShopLabel }}</el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="shop in selectableShopList"
          :key="shop.shopId"
          :command="shop.shopId"
          :class="{ 'is-current-shop': shop.shopId === sessionStore.currentShopId }"
        >
          {{ shopLabel(shop) }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore, type ShopOption } from '../../stores/session';
import { ModuleCode } from '../../utils/constants';
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
 * 只有多于一家可选门店时才显示切换器。
 */
const showSwitcher = computed(() => selectableShopList.value.length > 1);

/**
 * 下拉按钮上的当前门店名称。还没匹配到门店时显示占位文案。
 */
const currentShopLabel = computed(() => {
  const currentShop = selectableShopList.value.find((shop) => shop.shopId === sessionStore.currentShopId);
  if (isEmpty(currentShop)) {
    return '选择门店';
  }
  return shopLabel(currentShop);
});

/**
 * 进入业务页时，如果当前门店不属于该业务线，自动切到第一家匹配门店。
 */
watch(
  selectableShopList,
  (shopList) => {
    if (shopList.length === 0) {
      return;
    }
    const currentShopMatched = shopList.some((shop) => shop.shopId === sessionStore.currentShopId);
    if (currentShopMatched !== true) {
      sessionStore.saveCurrentShopId(shopList[0].shopId);
    }
  },
  { immediate: true },
);

/**
 * 门店下拉展示名称。
 */
function shopLabel(shop: ShopOption): string {
  return `${shop.shopName}（${shop.shopCode}）`;
}

/**
 * 用户从下拉菜单选中一家门店。
 */
function onShopCommand(shopId: string): void {
  onShopChange(shopId);
}

/**
 * 用户切换门店。
 */
function onShopChange(shopId: string): void {
  sessionStore.saveCurrentShopId(shopId);
}
</script>

<style>
.shop-switcher {
  height: 32px;
  padding: 0 8px;
}

@media (max-width: 768px) {
  .shop-switcher {
    max-width: 120px;
  }

  .shop-switcher > span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.el-dropdown-menu__item.is-current-shop,
.el-dropdown-menu__item.is-current-shop:hover,
.el-dropdown-menu__item.is-current-shop:focus {
  color: #2563eb;
  background-color: #e8f0fe;
  font-weight: 600;
}
</style>
