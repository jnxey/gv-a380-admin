import axios from 'axios';
import { ElMessage } from 'element-plus';
import { ensureAccessToken } from './access-token';
import { AuthApiPath, getLoginLocationPath, HttpStatusCode, ResponseCode, StorageKey } from './constants';
import { isEmpty } from './tools';

const http = axios.create({
  baseURL: '',
  timeout: 20000,
});

/**
 * 自动附带后台令牌和当前门店。单门店账号也会带上门店头。
 */
http.interceptors.request.use(async (config) => {
  // 1. 登录和退出不刷新。退出要作废当前这张，不能先换成新的
  if (config.url !== AuthApiPath.LOGIN && config.url !== AuthApiPath.LOGOUT) {
    await ensureAccessToken();
  }
  // 2. 附带本地令牌和当前门店
  const accessToken = window.localStorage.getItem(StorageKey.ACCESS_TOKEN);
  const currentShopId = window.localStorage.getItem(StorageKey.CURRENT_SHOP_ID);
  config.headers = config.headers || {};
  if (!isEmpty(accessToken)) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (!isEmpty(currentShopId)) {
    config.headers['X-Shop-Id'] = currentShopId;
  }
  return config;
});

/**
 * 解开统一响应。失败时提示后端文案。
 */
http.interceptors.response.use(
  (response) => {
    const responseBody = response.data as { code?: number; message?: string; data?: unknown };
    if (responseBody.code !== ResponseCode.SUCCESS) {
      const failMessage = isEmpty(responseBody.message) ? '请求失败' : responseBody.message;
      ElMessage.error(failMessage);
      return Promise.reject(responseBody);
    }
    return responseBody.data;
  },
  (error) => {
    if (error?.isAccessTokenRefreshError === true) {
      return Promise.reject(error);
    }
    const statusCode = error?.response?.status;
    const failMessage = error?.response?.data?.message;
    if (statusCode === HttpStatusCode.UNAUTHORIZED) {
      window.localStorage.removeItem(StorageKey.ACCESS_TOKEN);
      const loginLocationPath = getLoginLocationPath();
      if (window.location.pathname !== loginLocationPath) {
        window.location.href = loginLocationPath;
      }
    }
    ElMessage.error(isEmpty(failMessage) ? '请求失败' : failMessage);
    return Promise.reject(error);
  },
);

export default http;
