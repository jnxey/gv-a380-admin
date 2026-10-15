/**
 * 后端 component_path 与本地页面的对应关系。
 * 菜单是否出现由角色接口决定，这里只提供页面实现。
 */
export const viewComponentMap: Record<string, () => Promise<unknown>> = {
  'member/query': () => import('../views/member/MemberQueryView.vue'),
  'member/recharge': () => import('../views/member/RechargeView.vue'),
  'finance/bill': () => import('../views/finance/BillView.vue'),
  'ktv/shop': () => import('../views/ktv/ShopView.vue'),
  'ktv/room': () => import('../views/ktv/RoomView.vue'),
  'ktv/verify': () => import('../views/ktv/VerifyView.vue'),
  'hotel/room-type': () => import('../views/hotel/RoomTypeView.vue'),
  'hotel/room': () => import('../views/hotel/RoomView.vue'),
  'hotel/stay': () => import('../views/hotel/StayView.vue'),
  'system/user': () => import('../views/system/UserView.vue'),
  'system/role': () => import('../views/system/RoleView.vue'),
};
