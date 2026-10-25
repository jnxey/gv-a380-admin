import { createRouter, createWebHashHistory } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { AccountCenter, Home, StorageKey } from '../utils/constants';
import { isEmpty } from '../utils/tools';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/login/LoginView/LoginView.vue'),
    },
    {
      path: '/',
      name: 'admin-layout',
      component: () => import('../layout/AdminLayout.vue'),
      children: [
        {
          path: '',
          name: Home.ROUTE_NAME,
          component: () => import('../views/home/HomeView/HomeView.vue'),
          meta: {
            title: Home.TITLE,
          },
        },
        {
          path: AccountCenter.PATH,
          name: AccountCenter.ROUTE_NAME,
          component: () => import('../views/account/AccountCenterView/AccountCenterView.vue'),
          meta: {
            title: AccountCenter.TITLE,
          },
        },
      ],
    },
  ],
});

/**
 * 未登录去登录页。登录后按角色菜单补注册路由。
 */
router.beforeEach(async (to) => {
  const sessionStore = useSessionStore();
  const localAccessToken = window.localStorage.getItem(StorageKey.ACCESS_TOKEN) || '';
  // 本地令牌已清、内存还在时，对齐成未登录，避免地址已是登录页却仍挂着业务布局
  if (isEmpty(localAccessToken) && isEmpty(sessionStore.accessToken) !== true) {
    sessionStore.accessToken = '';
    sessionStore.menuLoaded = false;
  }
  if (to.path === '/login') {
    return true;
  }
  if (isEmpty(sessionStore.accessToken) || isEmpty(localAccessToken)) {
    return '/login';
  }
  if (sessionStore.menuLoaded !== true) {
    try {
      await sessionStore.loadSession(router);
    } catch {
      // 拉资料失败（含 401）时进登录页，避免导航中断后白屏
      return '/login';
    }
    return to.fullPath;
  }
  return true;
});

export default router;
