import { createRouter, createWebHistory } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { isEmpty } from '../utils/tools';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/login/LoginView.vue'),
    },
    {
      path: '/',
      name: 'admin-layout',
      component: () => import('../layout/AdminLayout.vue'),
      children: [],
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
  if (to.path === '/') {
    const firstMenuPath = sessionStore.findFirstMenuPath();
    if (!isEmpty(firstMenuPath)) {
      return firstMenuPath;
    }
  }
  return true;
});

export default router;
