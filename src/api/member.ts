/**
 * 会员相关接口地址（相对 API_PREFIX）。
 */
export const MemberApi = {
  LIST: '/members',
  CHAT_USER: '/members/chat-user',
  SYNC: '/members/sync',
  STATUS: '/members/status',
  OPEN: '/members/open',
  PAY_QR: '/members/pay-qr',
  RECHARGE: '/members/recharge',
} as const;
