import { createRouter, createWebHashHistory } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { AccountCenter, Home } from '../utils/constants';
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
  if (to.path === '/login') {
    return true;
  }
  if (isEmpty(sessionStore.accessToken)) {
    return '/login';
  }
  if (sessionStore.menuLoaded !== true) {
    await sessionStore.loadSession(router);
    return to.fullPath;
  }
  return true;
});

export default router;
