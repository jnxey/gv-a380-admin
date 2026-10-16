<template>
  <el-select v-if="showSwitcher" v-model="selectedShopId" class="shop-switcher">
    <el-option v-for="shop in selectableShopList" :key="shop.shopId" :label="shopLabel(shop)" :value="shop.shopId" />
  </el-select>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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
 * 有可选门店时就显示当前店。只有一家时下拉里也是这一家。
 */
const showSwitcher = computed(() => selectableShopList.value.length > 0);

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
 * 门店下拉展示名称。
 */
function shopLabel(shop: ShopOption): string {
  return `${shop.shopName}（${shop.shopCode}）`;
}
</script>

<style scoped>
.shop-switcher {
  width: 220px;
}
</style>
