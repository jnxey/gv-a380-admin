import { API_PREFIX } from './prefix';

/**
 * 地图瓦片与逆地理接口地址。
 * 瓦片给 Leaflet 用完整路径；逆地理走 axios，相对 API_PREFIX。
 */
export const MapApi = {
  TILE: `${API_PREFIX}/map/tiles/{z}/{x}/{y}`,
  REVERSE: '/map/reverse',
} as const;
