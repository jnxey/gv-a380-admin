/**
 * KTV 模块接口地址（相对 API_PREFIX）。
 */
export const KtvApi = {
  SHOPS: '/ktv/shops',
  shop: (shopId: string) => `/ktv/shops/${shopId}`,
  shopImages: (shopId: string) => `/ktv/shops/${shopId}/images`,
  shopImage: (shopId: string, imageId: string) => `/ktv/shops/${shopId}/images/${imageId}`,
  ROOM_TYPES: '/ktv/room-types',
  ROOM_TYPES_SORT: '/ktv/room-types/sort',
  roomType: (roomTypeId: string) => `/ktv/room-types/${roomTypeId}`,
  roomTypeImages: (roomTypeId: string) => `/ktv/room-types/${roomTypeId}/images`,
  roomTypeImage: (roomTypeId: string, imageId: string) => `/ktv/room-types/${roomTypeId}/images/${imageId}`,
  ROOMS: '/ktv/rooms',
  ROOMS_SORT: '/ktv/rooms/sort',
  room: (roomId: string) => `/ktv/rooms/${roomId}`,
  roomStatus: (roomId: string) => `/ktv/rooms/${roomId}/room-status`,
  roomExtendOccupy: (roomId: string) => `/ktv/rooms/${roomId}/extend-occupy`,
  BOOKING_ORDERS: '/ktv/booking-orders',
  bookingOrderFreeRooms: (bookingOrderId: string) => `/ktv/booking-orders/${bookingOrderId}/free-rooms`,
  bookingOrderVerify: (bookingOrderId: string) => `/ktv/booking-orders/${bookingOrderId}/verify`,
  bookingOrderCancel: (bookingOrderId: string) => `/ktv/booking-orders/${bookingOrderId}/cancel`,
  PAY_QR: '/ktv/pay-qr',
  DEDUCT: '/ktv/deduct',
  BILLS: '/ktv/bills',
  BILLS_SUMMARY: '/ktv/bills/summary',
  PAYMENT_NOTICES: '/ktv/payment-notices',
} as const;
