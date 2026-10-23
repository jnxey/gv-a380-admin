/**
 * MapTiler 瓦片与逆地理 URL 模板（与聊天服 map.foreign* 配置一致）。
 * 瓦片给 Leaflet；逆地理用 {lng} {lat} 替换后直连。
 */
export const MapApi = {
  TILE: 'https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=G1d5bpsa6Q7F7QwnE7S7',
  REVERSE: 'https://api.maptiler.com/geocoding/{lng},{lat}.json?key=G1d5bpsa6Q7F7QwnE7S7&language=zh',
} as const;
