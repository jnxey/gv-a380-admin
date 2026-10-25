/**
 * 会话失效跳转。由入口注册，避免 request 与 session/router 循环依赖。
 */
let sessionExpiredHandler: (() => void | Promise<void>) | null = null;
let sessionExpiredHandling = false;

/**
 * 注册令牌失效后的清理与跳登录。
 */
export function registerSessionExpiredHandler(handler: () => void | Promise<void>): void {
  sessionExpiredHandler = handler;
}

/**
 * 令牌失效：清本地令牌，并执行一次跳登录（并发 401 只跳一次）。
 */
export function handleSessionExpired(): void {
  if (sessionExpiredHandling === true) {
    return;
  }
  sessionExpiredHandling = true;
  const handler = sessionExpiredHandler;
  if (handler === null) {
    sessionExpiredHandling = false;
    return;
  }
  Promise.resolve(handler()).finally(() => {
    sessionExpiredHandling = false;
  });
}
