/**
 * 与后端保持一致的常量。
 */
export const ResponseCode = {
  SUCCESS: 0,
} as const;

export const HttpStatusCode = {
  UNAUTHORIZED: 401,
} as const;

export const ModuleCode = {
  CORE: 'CORE',
  KTV: 'KTV',
  HOTEL: 'HOTEL',
} as const;

export const ShopType = {
  KTV: 'KTV',
  HOTEL: 'HOTEL',
} as const;

export const PermissionCode = {
  KTV_SHOP_SAVE: 'ktv:shop:save',
  KTV_ROOM_SAVE: 'ktv:room:save',
  KTV_ORDER_VERIFY: 'ktv:order:verify',
  KTV_ORDER_CONSUME: 'ktv:order:consume',
  KTV_ORDER_CANCEL: 'ktv:order:cancel',
  HOTEL_ROOM_TYPE_SAVE: 'hotel:room-type:save',
  HOTEL_ROOM_SAVE: 'hotel:room:save',
  HOTEL_STAY_CHECK_IN: 'hotel:stay:check-in',
  HOTEL_STAY_EXTEND: 'hotel:stay:extend',
  HOTEL_STAY_CHECK_OUT: 'hotel:stay:check-out',
  HOTEL_ORDER_CANCEL: 'hotel:order:cancel',
  MEMBER_RECHARGE: 'member:recharge',
  SYSTEM_USER_QUERY: 'system:user:query',
  SYSTEM_USER_SAVE: 'system:user:save',
  SYSTEM_ROLE_QUERY: 'system:role:query',
  SYSTEM_ROLE_SAVE: 'system:role:save',
} as const;

/**
 * 菜单根节点父级 ID，与后端一致。
 */
export const MenuRoot = {
  PARENT_ID: '0',
} as const;

export const RecordStatus = {
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED',
} as const;

export const KtvRoomType = {
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  LARGE: 'LARGE',
} as const;

export const KtvOrderStatus = {
  PENDING_VERIFY: 'PENDING_VERIFY',
  VERIFIED: 'VERIFIED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

export const HotelOrderStatus = {
  BOOKED: 'BOOKED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
} as const;

export const HotelRoomStatus = {
  IDLE: 'IDLE',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export const HotelBedType = {
  LARGE: 'LARGE',
  TWIN: 'TWIN',
} as const;

export const FinanceBizType = {
  RECHARGE: 'RECHARGE',
  KTV_BOOKING: 'KTV_BOOKING',
  KTV_IN_STORE: 'KTV_IN_STORE',
  HOTEL_ROOM_FEE: 'HOTEL_ROOM_FEE',
  REFUND: 'REFUND',
} as const;

export const PageSetting = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  ROOM_LOOKUP_PAGE_SIZE: 100,
} as const;

export const StorageKey = {
  ACCESS_TOKEN: 'gv_a380_admin_access_token',
  CURRENT_SHOP_ID: 'gv_a380_admin_current_shop_id',
} as const;

export const AccountCenter = {
  PATH: '/account',
  TITLE: '个人中心',
  ROUTE_NAME: 'account-center',
} as const;

export const MenuIconName = {
  MEMBER: 'MEMBER',
  MEMBER_QUERY: 'MEMBER_QUERY',
  MEMBER_RECHARGE: 'MEMBER_RECHARGE',
  FINANCE: 'FINANCE',
  FINANCE_BILL: 'FINANCE_BILL',
  KTV: 'KTV',
  KTV_SHOP: 'KTV_SHOP',
  KTV_ROOM: 'KTV_ROOM',
  KTV_VERIFY: 'KTV_VERIFY',
  HOTEL: 'HOTEL',
  HOTEL_ROOM_TYPE: 'HOTEL_ROOM_TYPE',
  HOTEL_ROOM: 'HOTEL_ROOM',
  HOTEL_STAY: 'HOTEL_STAY',
  SYSTEM: 'SYSTEM',
  SYSTEM_USER: 'SYSTEM_USER',
  SYSTEM_ROLE: 'SYSTEM_ROLE',
} as const;

export const menuIconNameByPath: Record<string, string> = {
  '/member': MenuIconName.MEMBER,
  '/member/query': MenuIconName.MEMBER_QUERY,
  '/member/recharge': MenuIconName.MEMBER_RECHARGE,
  '/finance': MenuIconName.FINANCE,
  '/finance/bill': MenuIconName.FINANCE_BILL,
  '/ktv': MenuIconName.KTV,
  '/ktv/shop': MenuIconName.KTV_SHOP,
  '/ktv/room': MenuIconName.KTV_ROOM,
  '/ktv/verify': MenuIconName.KTV_VERIFY,
  '/hotel': MenuIconName.HOTEL,
  '/hotel/room-type': MenuIconName.HOTEL_ROOM_TYPE,
  '/hotel/room': MenuIconName.HOTEL_ROOM,
  '/hotel/stay': MenuIconName.HOTEL_STAY,
  '/system': MenuIconName.SYSTEM,
  '/system/user': MenuIconName.SYSTEM_USER,
  '/system/role': MenuIconName.SYSTEM_ROLE,
};

export const statusLabelMap: Record<string, string> = {
  ENABLED: '启用',
  DISABLED: '停用',
  PENDING_VERIFY: '待核销',
  VERIFIED: '已核销',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REFUNDED: '已退款',
  BOOKED: '已预订',
  CHECKED_IN: '已入住',
  CHECKED_OUT: '已退房',
  IDLE: '空闲',
  OCCUPIED: '在住',
  MAINTENANCE: '维修',
  SMALL: '小包',
  MEDIUM: '中包',
  LARGE: '大床/大包',
  TWIN: '双床',
  RECHARGE: '充值',
  KTV_BOOKING: 'KTV预订',
  KTV_IN_STORE: 'KTV店内消费',
  HOTEL_ROOM_FEE: '酒店房费',
  REFUND: '退款',
  IN: '收入',
  OUT: '支出',
  KTV: 'KTV',
  HOTEL: '酒店',
  GROUP: '集团',
};

/**
 * 把状态编码转成中文。未知编码原样返回，避免页面空白。
 */
export function statusLabel(statusCode: string): string {
  const label = statusLabelMap[statusCode];
  if (label === undefined) {
    return statusCode;
  }
  return label;
}
