<template>
  <el-container class="admin-layout">
    <el-aside width="220px" class="admin-aside">
      <div class="brand">A380 管理后台</div>
      <el-menu :default-active="route.path" router>
        <el-sub-menu v-for="menu in sessionStore.menuTree" :key="menu.menuId" :index="menu.menuPath">
          <template #title>{{ menu.menuName }}</template>
          <el-menu-item v-for="childMenu in menu.children" :key="childMenu.menuId" :index="childMenu.menuPath">
            {{ childMenu.menuName }}
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="admin-header">
        <ShopSwitcher />
        <div class="header-right">
          <span>{{ sessionStore.realName }}</span>
          <el-button link type="primary" @click="onLogout">退出</el-button>
        </div>
      </el-header>
      <el-main>
        <router-view :key="viewKey" />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ShopSwitcher from '../components/ShopSwitcher.vue';
import { useSessionStore } from '../stores/session';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

/**
 * 门店或路由变化时重挂页面，让列表按新门店重新请求。
 */
const viewKey = computed(() => `${sessionStore.currentShopId}-${route.fullPath}`);

/**
 * 退出并作废当前令牌。
 */
async function onLogout(): Promise<void> {
  await sessionStore.logout(router);
}
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
}
.brand {
  height: 56px;
  line-height: 56px;
  padding: 0 16px;
  font-weight: 600;
}
.admin-aside :deep(.el-menu) {
  background: #1f2a37;
  border-right: none;
}
.admin-aside :deep(.el-sub-menu__title),
.admin-aside :deep(.el-menu-item) {
  color: #e5e7eb;
}
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
