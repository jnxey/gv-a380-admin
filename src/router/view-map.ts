/**
 * 后端 component_path 与本地页面的对应关系。
 * 菜单是否出现由角色接口决定，这里只提供页面实现。
 */
export const viewComponentMap: Record<string, () => Promise<unknown>> = {
  'member/query': () => import('../views/member/MemberQueryView/MemberQueryView.vue'),
  'member/recharge': () => import('../views/member/RechargeView/RechargeView.vue'),
  'finance/bill': () => import('../views/finance/BillView/BillView.vue'),
  'finance/member-bill': () => import('../views/finance/MemberBillView/MemberBillView.vue'),
  'ktv/shop': () => import('../views/ktv/ShopView/ShopView.vue'),
  'ktv/room-type': () => import('../views/ktv/RoomTypeView/RoomTypeView.vue'),
  'ktv/room': () => import('../views/ktv/RoomView/RoomView.vue'),
  'ktv/room-status': () => import('../views/ktv/RoomStatusView/RoomStatusView.vue'),
  'ktv/verify': () => import('../views/ktv/VerifyView/VerifyView.vue'),
  'ktv/bill': () => import('../views/ktv/BillView/KtvBillView.vue'),
  'hotel/shop': () => import('../views/hotel/ShopView/ShopView.vue'),
  'hotel/room-type': () => import('../views/hotel/RoomTypeView/RoomTypeView.vue'),
  'hotel/room': () => import('../views/hotel/RoomView/RoomView.vue'),
  'hotel/stay': () => import('../views/hotel/StayView/StayView.vue'),
  'system/user': () => import('../views/system/UserView/UserView.vue'),
  'system/role': () => import('../views/system/RoleView/RoleView.vue'),
};
