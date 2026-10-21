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

/**
 * 门店收款二维码。文案是前缀加门店编码，海报是紫底白码。
 */
export const ShopPayQr = {
  PREFIX: 'GP_',
  IMAGE_WIDTH: 240,
  MARGIN: 1,
  ERROR_CORRECTION_LEVEL: 'H',
  BACKGROUND_COLOR: '#6B2BD9',
  HINT: '打开WV Chat扫一扫',
  LOGO_URL: '/wv-chat-logo.png',
  LOGO_SIZE: 48,
  POSTER_SCALE: 2,
  FILE_EXTENSION: '.png',
} as const;

/**
 * 图片数量、文件大小和宽度上限。数量和大小与服务端一致，宽度在上传前压缩。
 */
export const ShopImageLimit = {
  MAX_COUNT: 6,
  MAX_BYTES: 5 * 1024 * 1024,
  MAX_WIDTH: 750,
} as const;

/**
 * 允许上传的门店图片类型。
 */
export const ShopImageMime = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
} as const;

export const PermissionCode = {
  KTV_SHOP_SAVE: 'ktv:shop:save',
  KTV_ROOM_SAVE: 'ktv:room:save',
  KTV_ROOM_TYPE_SAVE: 'ktv:room-type:save',
  KTV_ORDER_VERIFY: 'ktv:order:verify',
  KTV_ORDER_CONSUME: 'ktv:order:consume',
  KTV_ORDER_CANCEL: 'ktv:order:cancel',
  KTV_DEDUCT: 'ktv:deduct',
  HOTEL_SHOP_SAVE: 'hotel:shop:save',
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

/**
 * 角色分配树上的节点种类。菜单和权限主键会重复，用前缀区分。
 */
export const AssignTreeNodeKind = {
  MENU: 'menu',
  PERMISSION: 'permission',
} as const;

export const AssignTreeNodeKey = {
  SEPARATOR: ':',
} as const;

export const RecordStatus = {
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED',
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

/**
 * KTV 包厢运营状态。使用中由核销写入，页面不能手动选成使用中。
 */
export const KtvRoomStatus = {
  IDLE: 'IDLE',
  IN_USE: 'IN_USE',
  CLEANING: 'CLEANING',
  MAINTENANCE: 'MAINTENANCE',
  CLOSED: 'CLOSED',
} as const;

/**
 * 线下开包厢可选的演唱小时。
 */
export const KtvOccupyDuration = {
  HOUR_LIST: [2, 3, 4, 5, 6],
} as const;

/**
 * 包厢状态页待核销查询的开唱时间窗口，现在往前和往后各这么多小时。
 */
export const KtvPendingVerifyWindow = {
  HOURS: 4,
} as const;

/**
 * 使用中包厢到点提醒。剩余不超过这个分钟数时改成倒计时。
 */
export const KtvOccupyRemind = {
  LEAD_MINUTES: 30,
  MINUTE_MILLISECONDS: 60 * 1000,
} as const;

export const FinanceBizType = {
  RECHARGE: 'RECHARGE',
  KTV_BOOKING: 'KTV_BOOKING',
  KTV_IN_STORE: 'KTV_IN_STORE',
  HOTEL_ROOM_FEE: 'HOTEL_ROOM_FEE',
  REFUND: 'REFUND',
  SHOP_SCAN_PAY: 'SHOP_SCAN_PAY',
} as const;

/**
 * 财务流水方向。
 */
export const FinanceDirection = {
  IN: 'IN',
  OUT: 'OUT',
} as const;

export const PageSetting = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  ROOM_LOOKUP_PAGE_SIZE: 100,
} as const;

/** 列表里代替真实核销码的展示文字。 */
export const VerifyCodeMask = '******';

/** 北京时间的标准偏移。 */
export const BeijingTimeZoneOffset = '+08:00';

/** 门店时区。偏移是保存值，名称只用于展示。 */
export const TimeZoneOptionList = [
  { offset: '-12:00', name: '国际日期变更线西' },
  { offset: '-11:00', name: '萨摩亚' },
  { offset: '-10:00', name: '夏威夷' },
  { offset: '-09:30', name: '马克萨斯' },
  { offset: '-09:00', name: '阿拉斯加' },
  { offset: '-08:00', name: '太平洋' },
  { offset: '-07:00', name: '山地' },
  { offset: '-06:00', name: '中部' },
  { offset: '-05:00', name: '东部' },
  { offset: '-04:00', name: '大西洋' },
  { offset: '-03:30', name: '纽芬兰' },
  { offset: '-03:00', name: '巴西利亚' },
  { offset: '-02:00', name: '南乔治亚' },
  { offset: '-01:00', name: '亚速尔' },
  { offset: '+00:00', name: '伦敦' },
  { offset: '+01:00', name: '中欧' },
  { offset: '+02:00', name: '东欧' },
  { offset: '+03:00', name: '莫斯科' },
  { offset: '+03:30', name: '德黑兰' },
  { offset: '+04:00', name: '迪拜' },
  { offset: '+04:30', name: '喀布尔' },
  { offset: '+05:00', name: '卡拉奇' },
  { offset: '+05:30', name: '新德里' },
  { offset: '+05:45', name: '加德满都' },
  { offset: '+06:00', name: '达卡' },
  { offset: '+06:30', name: '仰光' },
  { offset: '+07:00', name: '曼谷' },
  { offset: '+08:00', name: '北京' },
  { offset: '+09:00', name: '东京' },
  { offset: '+09:30', name: '阿德莱德' },
  { offset: '+10:00', name: '悉尼' },
  { offset: '+10:30', name: '豪勋爵岛' },
  { offset: '+11:00', name: '努美阿' },
  { offset: '+12:00', name: '奥克兰' },
  { offset: '+12:45', name: '查塔姆' },
  { offset: '+13:00', name: '努库阿洛法' },
  { offset: '+14:00', name: '基里巴斯' },
] as const;

/**
 * 把时区偏移显示成地名加偏移。不认识的偏移原样返回。
 */
export function timeZoneLabel(timeZoneOffset: string): string {
  const matchedOption = TimeZoneOptionList.find((timeZoneOption) => timeZoneOption.offset === timeZoneOffset);
  if (matchedOption === undefined) {
    return timeZoneOffset;
  }
  return `${matchedOption.name} ${matchedOption.offset}`;
}

/** 营业时间可选档，从 00:00 到 23:30，每 30 分钟一档。 */
export const BusinessHourList = Array.from({ length: 48 }, (_, slotIndex) => {
  const hourText = String(Math.floor(slotIndex / 2)).padStart(2, '0');
  const minuteText = slotIndex % 2 === 0 ? '00' : '30';
  return `${hourText}:${minuteText}`;
});

/** 没有坐标时，地图默认居中北京。 */
export const BeijingLocation = {
  LONGITUDE: 116.4074,
  LATITUDE: 39.9042,
} as const;

/** 地图代理。瓦片地址里的 {z} {x} {y} 由地图组件替换。 */
export const MapApiPath = {
  TILE: '/admin/map/tiles/{z}/{x}/{y}',
  REVERSE: '/admin/map/reverse',
} as const;

export const StorageKey = {
  ACCESS_TOKEN: 'gv_a380_admin_access_token',
  CURRENT_SHOP_ID: 'gv_a380_admin_current_shop_id',
} as const;

export const AuthApiPath = {
  LOGIN: '/admin/auth/login',
  LOGOUT: '/admin/auth/logout',
  REFRESH: '/admin/auth/refresh',
} as const;

/** 后台令牌剩余不超过 30 分钟时再换一张。 */
export const AccessTokenLifetime = {
  REFRESH_BEFORE_SECONDS: 30 * 60,
  MILLISECONDS_PER_SECOND: 1000,
} as const;

export const AccountCenter = {
  PATH: '/account',
  TITLE: '个人中心',
  ROUTE_NAME: 'account-center',
} as const;

export const Home = {
  PATH: '/',
  TITLE: '首页',
  ROUTE_NAME: 'home',
} as const;

export const MenuIconName = {
  HOME: 'HOME',
  MEMBER: 'MEMBER',
  MEMBER_QUERY: 'MEMBER_QUERY',
  MEMBER_RECHARGE: 'MEMBER_RECHARGE',
  FINANCE: 'FINANCE',
  FINANCE_BILL: 'FINANCE_BILL',
  KTV: 'KTV',
  KTV_SHOP: 'KTV_SHOP',
  KTV_ROOM: 'KTV_ROOM',
  KTV_ROOM_OPEN: 'KTV_ROOM_OPEN',
  KTV_ROOM_CLEAN: 'KTV_ROOM_CLEAN',
  KTV_ROOM_IDLE: 'KTV_ROOM_IDLE',
  KTV_VERIFY: 'KTV_VERIFY',
  HOTEL: 'HOTEL',
  HOTEL_ROOM_TYPE: 'HOTEL_ROOM_TYPE',
  HOTEL_ROOM: 'HOTEL_ROOM',
  HOTEL_STAY: 'HOTEL_STAY',
  SYSTEM: 'SYSTEM',
  SYSTEM_USER: 'SYSTEM_USER',
  SYSTEM_ROLE: 'SYSTEM_ROLE',
  MENU_EXPAND: 'MENU_EXPAND',
  MENU_COLLAPSE: 'MENU_COLLAPSE',
  MENU_HAMBURGER: 'MENU_HAMBURGER',
  LOGIN_ACCOUNT: 'LOGIN_ACCOUNT',
  LOGIN_PASSWORD: 'LOGIN_PASSWORD',
  ARROW_RIGHT: 'ARROW_RIGHT',
  REFRESH: 'REFRESH',
  SCAN_QR: 'SCAN_QR',
} as const;

export const menuIconNameByPath: Record<string, string> = {
  [Home.PATH]: MenuIconName.HOME,
  '/member': MenuIconName.MEMBER,
  '/member/query': MenuIconName.MEMBER_QUERY,
  '/member/recharge': MenuIconName.MEMBER_RECHARGE,
  '/finance': MenuIconName.FINANCE,
  '/finance/bill': MenuIconName.FINANCE_BILL,
  '/ktv': MenuIconName.KTV,
  '/ktv/shop': MenuIconName.KTV_SHOP,
  '/ktv/room-type': MenuIconName.HOTEL_ROOM_TYPE,
  '/ktv/room': MenuIconName.KTV_ROOM,
  '/ktv/room-status': MenuIconName.KTV_ROOM,
  '/ktv/verify': MenuIconName.KTV_VERIFY,
  '/hotel': MenuIconName.HOTEL,
  '/hotel/shop': MenuIconName.KTV_SHOP,
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
  IN_USE: '使用中',
  CLEANING: '打扫中',
  OCCUPIED: '在住',
  MAINTENANCE: '维修',
  CLOSED: '临时关闭',
  LARGE: '大床/大包',
  TWIN: '双床',
  RECHARGE: '充值',
  KTV_BOOKING: 'KTV预订',
  KTV_IN_STORE: 'KTV店内消费',
  SHOP_SCAN_PAY: '门店扫码付款',
  HOTEL_ROOM_FEE: '酒店房费',
  REFUND: '退款',
  IN: '收入',
  OUT: '支出',
  KTV: 'KTV',
  HOTEL: '酒店',
  GROUP: '集团',
  active: '正常',
  disabled: '禁用',
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
