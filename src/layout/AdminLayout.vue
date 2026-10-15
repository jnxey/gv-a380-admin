<template>
  <div class="admin-layout">
    <aside class="admin-aside">
      <div class="admin-brand">
        <img class="admin-brand-mark" src="/favicon.svg" alt="" />
        <span class="admin-brand-text">
          <span class="admin-brand-name">A380</span>
          <span class="admin-brand-sub">管理后台</span>
        </span>
      </div>
      <el-menu :default-active="route.path" :default-openeds="openedMenuPathList" router>
        <el-sub-menu v-for="menu in sessionStore.menuTree" :key="menu.menuId" :index="menu.menuPath">
          <template #title>{{ menu.menuName }}</template>
          <el-menu-item v-for="childMenu in menu.children" :key="childMenu.menuId" :index="childMenu.menuPath">
            {{ childMenu.menuName }}
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </aside>
    <div class="admin-main">
      <header class="admin-header">
        <span class="admin-title">{{ currentPageTitle }}</span>
        <div class="header-right">
          <ShopSwitcher />
          <el-popover trigger="hover" placement="bottom-end" :width="168">
            <template #reference>
              <button type="button" class="header-avatar" aria-label="账号菜单">
                <img class="header-avatar-image" src="/avatar.png" alt="" />
              </button>
            </template>
            <div class="account-menu">
              <div class="account-menu-name">{{ sessionStore.username }}</div>
              <button type="button" class="account-menu-item" @click="openAccountCenter">个人中心</button>
              <button type="button" class="account-menu-item" @click="onLogout">退出登录</button>
            </div>
          </el-popover>
        </div>
      </header>
      <main class="admin-content">
        <router-view :key="viewKey" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ShopSwitcher from '../components/ShopSwitcher.vue';
import { useSessionStore } from '../stores/session';
import { AccountCenter } from '../utils/constants';
import { isEmpty } from '../utils/tools';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

/**
 * 门店或路由变化时重挂页面，让列表按新门店重新请求。
 */
const viewKey = computed(() => `${sessionStore.currentShopId}-${route.fullPath}`);

/**
 * 顶栏当前页标题。路由没有标题时用系统名。
 */
const currentPageTitle = computed(() => {
  const pageTitle = route.meta.title;
  if (typeof pageTitle !== 'string' || isEmpty(pageTitle)) {
    return 'A380 管理后台';
  }
  return pageTitle;
});

/**
 * 进入后台时把菜单分组全部展开。
 */
const openedMenuPathList = computed(() => {
  return sessionStore.menuTree.map((menu) => menu.menuPath);
});

/**
 * 打开个人中心。
 */
function openAccountCenter(): void {
  router.push(AccountCenter.PATH);
}

/**
 * 退出并作废当前令牌。
 */
async function onLogout(): Promise<void> {
  await sessionStore.logout(router);
}
</script>

<style scoped>
.admin-layout {
  --admin-bg: #f4f6f8;
  --admin-surface: #ffffff;
  --admin-border: #e6e8ec;
  --admin-text: #1c2434;
  --admin-muted: #667085;
  --admin-primary: #2563eb;
  --admin-primary-soft: #e8f0fe;
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--admin-bg);
  color: var(--admin-text);
}

.admin-aside {
  width: 232px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
  background: var(--admin-surface);
  border-right: 1px solid var(--admin-border);
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  box-sizing: border-box;
  padding: 0 16px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--admin-border);
}

.admin-brand-mark {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  object-fit: contain;
}

.admin-brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-brand-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--admin-text);
}

.admin-brand-sub {
  font-size: 12px;
  line-height: 1.3;
  color: var(--admin-muted);
}

.admin-aside :deep(.el-menu) {
  border-right: none;
  background: transparent;
  padding: 4px 0 16px;
}

.admin-aside :deep(.el-menu-item),
.admin-aside :deep(.el-sub-menu__title) {
  height: 40px;
  margin: 2px 12px;
  border-radius: 8px;
  color: var(--admin-text);
}

.admin-aside :deep(.el-menu-item) {
  min-width: 0;
}

.admin-aside :deep(.el-menu-item:hover),
.admin-aside :deep(.el-sub-menu__title:hover) {
  background: var(--admin-bg);
}

.admin-aside :deep(.el-menu-item.is-active) {
  background: var(--admin-primary-soft);
  color: var(--admin-primary);
  font-weight: 600;
}

.admin-aside :deep(.el-sub-menu .el-menu) {
  background: transparent;
}

.admin-aside :deep(.el-sub-menu .el-menu-item) {
  padding-left: 36px;
}

.admin-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.admin-header {
  height: 56px;
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--admin-surface);
  border-bottom: 1px solid var(--admin-border);
}

.admin-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--admin-text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-avatar {
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: none;
  border-radius: 50%;
  background: var(--admin-primary-soft);
  cursor: pointer;
}

.header-avatar-image {
  width: 32px;
  height: 32px;
  object-fit: cover;
  display: block;
}

.account-menu-name {
  padding: 4px 8px 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1c2434;
}

.account-menu-item {
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  font-size: 14px;
  color: #1c2434;
  cursor: pointer;
}

.account-menu-item:hover {
  background: #f4f6f8;
}

.admin-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
  background: #f4f6f8;
}
</style>
