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
  'ktv/review': () => import('../views/ktv/ReviewView/ReviewView.vue'),
  'hotel/shop': () => import('../views/hotel/ShopView/ShopView.vue'),
  'hotel/room-type': () => import('../views/hotel/RoomTypeView/RoomTypeView.vue'),
  'hotel/room': () => import('../views/hotel/RoomView/RoomView.vue'),
  'hotel/room-status': () => import('../views/hotel/RoomStatusView/RoomStatusView.vue'),
  'hotel/order': () => import('../views/hotel/OrderView/HotelOrderView.vue'),
  'hotel/bill': () => import('../views/hotel/BillView/HotelBillView.vue'),
  'hotel/review': () => import('../views/hotel/ReviewView/ReviewView.vue'),
  'store/shop': () => import('../views/store/ShopView/ShopView.vue'),
  'store/category': () => import('../views/store/CategoryView/CategoryView.vue'),
  'store/product': () => import('../views/store/ProductView/ProductView.vue'),
  'store/purchase': () => import('../views/store/PurchaseView/PurchaseView.vue'),
  'store/cashier': () => import('../views/store/CashierView/CashierView.vue'),
  'store/sale': () => import('../views/store/SaleView/SaleView.vue'),
  'store/bill': () => import('../views/store/BillView/StoreBillView.vue'),
  'store/review': () => import('../views/store/ReviewView/ReviewView.vue'),
  'system/user': () => import('../views/system/UserView/UserView.vue'),
  'system/role': () => import('../views/system/RoleView/RoleView.vue'),
};
