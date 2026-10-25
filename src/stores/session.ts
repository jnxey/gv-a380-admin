import { defineStore } from 'pinia';
import { AuthApi } from '../api/auth';
import type { Router } from 'vue-router';
import { AccountCenter, Home, ModuleCode, StorageKey } from '../utils/constants';
import { isEmpty } from '../utils/tools';
import http from '../utils/request';
import { viewComponentMap } from '../router/view-map';

/**
 * 绑定门店。
 */
export interface ShopOption {
  shopId: string;
  shopCode: string;
  shopName: string;
  shopType: string;
  timeZone: string;
}

/**
 * 后端返回的菜单节点。
 */
export interface MenuNode {
  menuId: string;
  parentId: string;
  menuName: string;
  menuPath: string;
  componentPath: string;
  moduleCode: string;
  sortOrder: number;
  children: MenuNode[];
}

/**
 * 后台登录态、动态菜单和当前门店。
 */
export const useSessionStore = defineStore('session', {
  state: () => ({
    accessToken: window.localStorage.getItem(StorageKey.ACCESS_TOKEN) || '',
    currentShopId: window.localStorage.getItem(StorageKey.CURRENT_SHOP_ID) || '',
    username: '',
    realName: '',
    permissionCodeList: [] as string[],
    shopList: [] as ShopOption[],
    menuTree: [] as MenuNode[],
    menuLoaded: false,
  }),
  actions: {
    /**
     * 保存登录令牌。
     */
    saveAccessToken(accessToken: string): void {
      this.accessToken = accessToken;
      window.localStorage.setItem(StorageKey.ACCESS_TOKEN, accessToken);
    },
    /**
     * 切换当前门店，并写入本地，供请求头读取。
     */
    saveCurrentShopId(currentShopId: string): void {
      this.currentShopId = currentShopId;
      if (isEmpty(currentShopId)) {
        window.localStorage.removeItem(StorageKey.CURRENT_SHOP_ID);
        return;
      }
      window.localStorage.setItem(StorageKey.CURRENT_SHOP_ID, currentShopId);
    },
    /**
     * 判断当前账号是否拥有某个功能权限。
     */
    hasPermission(permissionCode: string): boolean {
      return this.permissionCodeList.some((item) => item === permissionCode);
    },
    /**
     * 按页面模块过滤可切换门店。
     */
    listShopsForModule(moduleCode: string): ShopOption[] {
      if (moduleCode === ModuleCode.KTV) {
        return this.shopList.filter((shop) => shop.shopType === 'KTV');
      }
      if (moduleCode === ModuleCode.HOTEL) {
        return this.shopList.filter((shop) => shop.shopType === 'HOTEL');
      }
      if (moduleCode === ModuleCode.STORE) {
        return this.shopList.filter((shop) => shop.shopType === 'STORE');
      }
      return this.shopList;
    },
    /**
     * 拉取资料和菜单，并注册当前角色可见路由。
     */
    async loadSession(router: Router): Promise<void> {
      const profile = (await http.get(AuthApi.PROFILE)) as {
        username: string;
        realName: string;
        permissionCodeList: string[];
        shopList: ShopOption[];
      };
      const menuTree = (await http.get(AuthApi.MENUS)) as MenuNode[];
      this.username = profile.username;
      this.realName = profile.realName;
      this.permissionCodeList = profile.permissionCodeList;
      this.shopList = profile.shopList;
      this.menuTree = menuTree;
      const shopStillBound = this.shopList.some((shop) => shop.shopId === this.currentShopId);
      if (isEmpty(this.currentShopId) || shopStillBound !== true) {
        const firstShop = this.shopList[0];
        this.saveCurrentShopId(isEmpty(firstShop) ? '' : firstShop.shopId);
      }
      this.registerMenuRoutes(router, menuTree);
      this.menuLoaded = true;
    },
    /**
     * 把叶子菜单注册到布局路由下。
     */
    registerMenuRoutes(router: Router, menuTree: MenuNode[]): void {
      menuTree.forEach((menuNode) => {
        menuNode.children.forEach((childMenu) => {
          const viewLoader = viewComponentMap[childMenu.componentPath];
          if (isEmpty(childMenu.componentPath) || viewLoader === undefined) {
            return;
          }
          if (router.hasRoute(childMenu.componentPath)) {
            return;
          }
          router.addRoute('admin-layout', {
            path: childMenu.menuPath,
            name: childMenu.componentPath,
            component: viewLoader,
            meta: {
              moduleCode: childMenu.moduleCode,
              title: childMenu.menuName,
            },
          });
        });
      });
    },
    /**
     * 退出登录，清掉令牌和动态路由。
     */
    async logout(router: Router): Promise<void> {
      try {
        await http.post(AuthApi.LOGOUT);
      } catch (error) {
        // 令牌已失效时仍然清理本地登录态
      }
      this.clearSession(router);
      await router.push('/login');
    },
    /**
     * 清理本地登录态。
     */
    clearSession(router: Router): void {
      this.accessToken = '';
      this.username = '';
      this.realName = '';
      this.permissionCodeList = [];
      this.shopList = [];
      this.menuTree = [];
      this.menuLoaded = false;
      window.localStorage.removeItem(StorageKey.ACCESS_TOKEN);
      router.getRoutes().forEach((routeRecord) => {
        if (
          routeRecord.name !== 'login' &&
          routeRecord.name !== 'admin-layout' &&
          routeRecord.name !== AccountCenter.ROUTE_NAME &&
          routeRecord.name !== Home.ROUTE_NAME &&
          routeRecord.name !== undefined
        ) {
          router.removeRoute(routeRecord.name);
        }
      });
    },
    /**
     * 令牌失效：先跳登录页，再清动态路由，避免当前页路由被卸掉后白屏。
     */
    async expireToLogin(router: Router): Promise<void> {
      this.accessToken = '';
      window.localStorage.removeItem(StorageKey.ACCESS_TOKEN);
      if (router.currentRoute.value.path !== '/login') {
        await router.replace('/login');
      }
      this.clearSession(router);
    },
  },
});
