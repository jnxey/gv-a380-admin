import axios from 'axios';
import { ElMessage } from 'element-plus';
import { AccessTokenLifetime, AuthApiPath, getLoginLocationPath, HttpStatusCode, ResponseCode, StorageKey } from './constants';
import { isEmpty } from './tools';

let refreshingAccessTokenPromise: Promise<string> | null = null;

/**
 * 刷新失败标记。同一批等待中的请求不再各弹一次提示。
 */
const AccessTokenRefreshErrorName = 'AccessTokenRefreshError';

/**
 * 发请求前确认后台令牌。剩余超过 30 分钟直接用；否则只刷新一次。
 */
export function ensureAccessToken(): Promise<string> {
  const accessToken = window.localStorage.getItem(StorageKey.ACCESS_TOKEN) || '';
  // 1. 没有令牌时不刷新，交给后续请求自己处理未登录
  if (isEmpty(accessToken)) {
    return Promise.resolve('');
  }
  // 2. 已有刷新在进行时，等待这一次，不再另起
  if (isEmpty(refreshingAccessTokenPromise) !== true) {
    return refreshingAccessTokenPromise;
  }
  // 3. 剩余时间超过 30 分钟，直接用本地令牌
  if (isAccessTokenFresh(accessToken) === true) {
    return Promise.resolve(accessToken);
  }
  // 4. 只发起一次刷新
  refreshingAccessTokenPromise = refreshAccessToken(accessToken).then((nextAccessToken) => {
    refreshingAccessTokenPromise = null;
    return nextAccessToken;
  }, (error: unknown) => {
    refreshingAccessTokenPromise = null;
    return Promise.reject(error);
  });
  return refreshingAccessTokenPromise;
}

/**
 * 判断本地令牌剩余时间是否还超过 30 分钟。
 */
function isAccessTokenFresh(accessToken: string): boolean {
  const expireAtSeconds = readAccessTokenExpireAtSeconds(accessToken);
  if (expireAtSeconds === null) {
    return false;
  }
  const nowSeconds = Math.floor(Date.now() / AccessTokenLifetime.MILLISECONDS_PER_SECOND);
  const remainingSeconds = expireAtSeconds - nowSeconds;
  return remainingSeconds > AccessTokenLifetime.REFRESH_BEFORE_SECONDS;
}

/**
 * 读取令牌里的过期秒数。签名不在浏览器里校验。
 */
function readAccessTokenExpireAtSeconds(accessToken: string): number | null {
  const tokenPartList = accessToken.split('.');
  if (tokenPartList.length !== 3) {
    return null;
  }
  const payloadSegment = tokenPartList[1];
  if (isEmpty(payloadSegment)) {
    return null;
  }
  try {
    const base64Text = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const paddingLength = (4 - (base64Text.length % 4)) % 4;
    const paddedBase64Text = base64Text + '='.repeat(paddingLength);
    const payloadText = window.atob(paddedBase64Text);
    const payload = JSON.parse(payloadText) as { exp?: unknown };
    if (typeof payload.exp !== 'number' || Number.isFinite(payload.exp) !== true) {
      return null;
    }
    return payload.exp;
  } catch {
    return null;
  }
}

/**
 * 用当前令牌换一张新令牌。这次请求不再进入刷新判断。
 */
function refreshAccessToken(accessToken: string): Promise<string> {
  return axios
    .post(AuthApiPath.REFRESH, {}, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 20000,
    })
    .then((response) => {
      const responseBody = response.data as { code?: number; message?: string; data?: { accessToken?: string } };
      const nextAccessToken = responseBody.data?.accessToken;
      if (responseBody.code !== ResponseCode.SUCCESS || isEmpty(nextAccessToken)) {
        const failMessage = isEmpty(responseBody.message) ? '请求失败' : responseBody.message;
        return rejectAccessTokenRefresh(failMessage, null);
      }
      // 刷新期间已经退出或换成了别的令牌时，不再把新令牌写回去
      const currentAccessToken = window.localStorage.getItem(StorageKey.ACCESS_TOKEN);
      if (currentAccessToken !== accessToken) {
        if (isEmpty(currentAccessToken)) {
          void axios.post(AuthApiPath.LOGOUT, {}, {
            headers: { Authorization: `Bearer ${nextAccessToken}` },
            timeout: 20000,
          });
        }
        return isEmpty(currentAccessToken) ? '' : currentAccessToken;
      }
      window.localStorage.setItem(StorageKey.ACCESS_TOKEN, nextAccessToken);
      return nextAccessToken;
    }, (error: unknown) => {
      const statusCode = readErrorStatusCode(error);
      const failMessage = readErrorMessage(error);
      if (statusCode === HttpStatusCode.UNAUTHORIZED) {
        window.localStorage.removeItem(StorageKey.ACCESS_TOKEN);
        const loginLocationPath = getLoginLocationPath();
        if (window.location.pathname !== loginLocationPath) {
          window.location.href = loginLocationPath;
        }
      }
      return rejectAccessTokenRefresh(failMessage, statusCode);
    });
}

/**
 * 提示一次并拒绝，避免同一批请求重复提示。
 */
function rejectAccessTokenRefresh(failMessage: string, statusCode: number | null): Promise<never> {
  ElMessage.error(failMessage);
  const refreshError = new Error(failMessage) as Error & { isAccessTokenRefreshError?: boolean; statusCode?: number | null };
  refreshError.name = AccessTokenRefreshErrorName;
  refreshError.isAccessTokenRefreshError = true;
  refreshError.statusCode = statusCode;
  return Promise.reject(refreshError);
}

/**
 * 读取失败响应上的 HTTP 状态码。
 */
function readErrorStatusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const statusCode = (error as { response?: { status?: unknown } }).response?.status;
  if (typeof statusCode !== 'number') {
    return null;
  }
  return statusCode;
}

/**
 * 读取失败响应上的提示文案。
 */
function readErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return '请求失败';
  }
  const failMessage = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message;
  if (typeof failMessage !== 'string' || isEmpty(failMessage)) {
    return '请求失败';
  }
  return failMessage;
}
