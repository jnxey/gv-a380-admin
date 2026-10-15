<template>
  <div class="admin-layout">
    <div v-if="menuDrawerOpen" class="admin-mask" @click="closeMenuDrawer" />
    <aside class="admin-aside" :class="{ 'is-collapsed': menuCollapsedForLayout, 'is-drawer-open': menuDrawerOpen }">
      <div class="admin-brand">
        <img class="admin-brand-mark" src="/favicon.svg" alt="" />
        <span v-if="menuCollapsedForLayout !== true" class="admin-brand-text">
          <span class="admin-brand-name">A380</span>
          <span class="admin-brand-sub">管理后台</span>
        </span>
      </div>
      <div class="admin-menu">
        <el-menu
          :default-active="route.path"
          :default-openeds="openedMenuPathList"
          :collapse="menuCollapsedForLayout"
          :collapse-transition="false"
          router
          @select="closeMenuDrawer"
        >
          <el-menu-item :index="Home.PATH">
            <MenuIcon :icon-name="resolveMenuIconName(Home.PATH)" />
            <span>{{ Home.TITLE }}</span>
          </el-menu-item>
          <el-sub-menu v-for="menu in sessionStore.menuTree" :key="menu.menuId" :index="menu.menuPath">
            <template #title>
              <MenuIcon :icon-name="resolveMenuIconName(menu.menuPath)" />
              <span>{{ menu.menuName }}</span>
            </template>
            <el-menu-item v-for="childMenu in menu.children" :key="childMenu.menuId" :index="childMenu.menuPath">
              <MenuIcon :icon-name="resolveMenuIconName(childMenu.menuPath)" />
              <span>{{ childMenu.menuName }}</span>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </div>
      <button
        type="button"
        class="admin-menu-toggle"
        :aria-label="menuCollapsed === true ? '展开' : '收起'"
        @click="toggleMenuCollapsed"
      >
        <svg class="admin-menu-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path v-if="menuCollapsed === true" d="m9 6 6 6-6 6" />
          <path v-else d="m15 6-6 6 6 6" />
        </svg>
      </button>
    </aside>
    <div class="admin-main">
      <header class="admin-header">
        <div class="header-left">
          <button type="button" class="header-menu" aria-label="打开菜单" @click="openMenuDrawer">
            <svg class="header-menu-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <span class="admin-title">{{ currentPageTitle }}</span>
        </div>
        <div class="header-right">
          <ShopSwitcher />
          <el-popover v-model:visible="accountMenuVisible" trigger="click" placement="bottom-end" :width="168">
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ShopSwitcher from '../components/ShopSwitcher.vue';
import MenuIcon from './MenuIcon.vue';
import { useSessionStore } from '../stores/session';
import { AccountCenter, Home, menuIconNameByPath } from '../utils/constants';
import { isEmpty } from '../utils/tools';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const menuCollapsed = ref(false);
const menuDrawerOpen = ref(false);
const accountMenuVisible = ref(false);
const narrowScreen = ref(false);
const narrowScreenQuery = window.matchMedia('(max-width: 768px)');

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
 * 按菜单路径取图标名。没有对应图标时返回空字符串。
 */
function resolveMenuIconName(menuPath: string): string {
  const iconName = menuIconNameByPath[menuPath];
  if (isEmpty(iconName)) {
    return '';
  }
  return iconName;
}

/**
 * 进入后台时把菜单分组全部展开。
 */
const openedMenuPathList = computed(() => {
  return sessionStore.menuTree.map((menu) => menu.menuPath);
});

/**
 * 宽屏沿用收起状态。窄屏抽屉始终展开文字。
 */
const menuCollapsedForLayout = computed(() => narrowScreen.value !== true && menuCollapsed.value === true);

/**
 * 按屏幕宽度切换抽屉。回到宽屏时关掉抽屉。
 */
function syncNarrowScreen(): void {
  narrowScreen.value = narrowScreenQuery.matches;
  if (narrowScreen.value !== true) {
    menuDrawerOpen.value = false;
  }
}

/**
 * 打开窄屏侧栏抽屉。
 */
function openMenuDrawer(): void {
  menuDrawerOpen.value = true;
}

/**
 * 关闭窄屏侧栏抽屉。
 */
function closeMenuDrawer(): void {
  menuDrawerOpen.value = false;
}

/**
 * 切换左侧菜单的收起和展开。刷新页面后恢复展开。
 */
function toggleMenuCollapsed(): void {
  menuCollapsed.value = menuCollapsed.value !== true;
}

/**
 * 打开个人中心。
 */
function openAccountCenter(): void {
  accountMenuVisible.value = false;
  router.push(AccountCenter.PATH);
}

/**
 * 退出并作废当前令牌。
 */
async function onLogout(): Promise<void> {
  accountMenuVisible.value = false;
  await sessionStore.logout(router);
}

onMounted(() => {
  syncNarrowScreen();
  narrowScreenQuery.addEventListener('change', syncNarrowScreen);
});

onBeforeUnmount(() => {
  narrowScreenQuery.removeEventListener('change', syncNarrowScreen);
});
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
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--admin-surface);
  border-right: 1px solid var(--admin-border);
}

.admin-aside.is-collapsed {
  width: 64px;
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

.admin-aside.is-collapsed .admin-brand {
  justify-content: center;
  padding: 0;
}

.admin-aside.is-collapsed .admin-menu {
  overflow-x: hidden;
}

.admin-aside.is-collapsed :deep(.el-menu.el-menu--collapse) {
  width: 100%;
}

.admin-menu {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.admin-menu-toggle {
  height: 40px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-top: 1px solid var(--admin-border);
  background: var(--admin-surface);
  color: var(--admin-text);
  cursor: pointer;
}

.admin-menu-toggle-icon {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.admin-aside.is-collapsed :deep(.menu-icon) {
  margin-right: 0;
}

.admin-menu-toggle:hover {
  background: var(--admin-bg);
}

.admin-aside.is-collapsed :deep(.el-menu-item),
.admin-aside.is-collapsed :deep(.el-sub-menu__title) {
  margin: 2px 8px;
  padding-left: 0;
  padding-right: 0;
  justify-content: center;
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

.admin-aside :deep(.admin-menu > .el-menu > .el-menu-item),
.admin-aside :deep(.el-sub-menu__title) {
  font-weight: 600;
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

.admin-mask {
  display: none;
}

.admin-header {
  height: 56px;
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 24px;
  background: var(--admin-surface);
  border-bottom: 1px solid var(--admin-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.header-menu {
  display: none;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--admin-text);
  cursor: pointer;
}

.header-menu-icon {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.admin-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 16px;
  font-weight: 600;
  color: var(--admin-text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  min-width: 0;
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

@media (max-width: 768px) {
  .admin-mask {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgba(28, 36, 52, 0.45);
  }

  .admin-aside,
  .admin-aside.is-collapsed {
    position: fixed;
    z-index: 30;
    top: 0;
    bottom: 0;
    left: 0;
    width: 232px;
    transform: translateX(-100%);
  }

  .admin-aside.is-drawer-open {
    transform: translateX(0);
  }

  .admin-menu-toggle {
    display: none;
  }

  .header-menu {
    display: inline-flex;
  }

  .admin-header {
    padding: 0 12px;
  }
}
</style>
