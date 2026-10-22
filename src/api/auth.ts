/**
 * 鉴权相关接口地址（相对 API_PREFIX）。
 */
export const AuthApi = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  PROFILE: '/auth/profile',
  MENUS: '/auth/menus',
  PASSWORD: '/auth/password',
} as const;
