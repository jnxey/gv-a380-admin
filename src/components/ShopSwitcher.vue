<template>
  <el-select
    v-if="showSwitcher"
    :model-value="sessionStore.currentShopId"
    placeholder="选择门店"
    style="width: 220px"
    @change="onShopChange"
  >
    <el-option v-for="shop in selectableShopList" :key="shop.shopId" :label="shopLabel(shop)" :value="shop.shopId" />
  </el-select>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore, type ShopOption } from '../stores/session';
import { ModuleCode } from '../utils/constants';
import { isEmpty } from '../utils/tools';

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
 * 用户切换门店。
 */
function onShopChange(shopId: string): void {
  sessionStore.saveCurrentShopId(shopId);
}
</script>
