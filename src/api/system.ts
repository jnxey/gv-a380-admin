/**
 * 系统用户与角色接口地址（相对 API_PREFIX）。
 */
export const SystemApi = {
  USERS: '/system/users',
  USERS_OPTIONS: '/system/users/options',
  user: (userId: string) => `/system/users/${userId}`,
  ROLES: '/system/roles',
  role: (roleId: string) => `/system/roles/${roleId}`,
} as const;
