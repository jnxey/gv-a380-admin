import axios from 'axios';
import { ElMessage } from 'element-plus';
import { ensureAccessToken } from './access-token';
import { AuthApiPath, goLoginPageByHash, HttpStatusCode, ResponseCode, StorageKey } from './constants';
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
    // 拦截器约定解包 data；axios 类型仍要求 AxiosResponse，这里按业务返回体交出。
    return responseBody.data as typeof response.data;
  },
  (error) => {
    if (error?.isAccessTokenRefreshError === true) {
      return Promise.reject(error);
    }
    const statusCode = error?.response?.status;
    const failMessage = error?.response?.data?.message;
    const requestUrl = error?.config?.url;
    // 登录接口的 401：账号密码错误，只 Toast，不改地址、不刷新
    if (statusCode === HttpStatusCode.UNAUTHORIZED && requestUrl !== AuthApiPath.LOGIN) {
      // 其它接口 401：清令牌，只改 hash 到 #/login，保留 # 前路径
      window.localStorage.removeItem(StorageKey.ACCESS_TOKEN);
      goLoginPageByHash();
    }
    ElMessage.error(isEmpty(failMessage) ? '请求失败' : failMessage);
    return Promise.reject(error);
  },
);

export default http;
