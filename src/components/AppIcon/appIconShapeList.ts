import { MenuIconName } from '../../utils/constants';

export const MenuIconShapeKind = {
  PATH: 'PATH',
  CIRCLE: 'CIRCLE',
  RECT: 'RECT',
} as const;

interface MenuIconPathShape {
  shapeKind: typeof MenuIconShapeKind.PATH;
  pathData: string;
}

interface MenuIconCircleShape {
  shapeKind: typeof MenuIconShapeKind.CIRCLE;
  centerX: number;
  centerY: number;
  radius: number;
}

interface MenuIconRectShape {
  shapeKind: typeof MenuIconShapeKind.RECT;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  cornerRadius?: number;
}

export type MenuIconShape = MenuIconPathShape | MenuIconCircleShape | MenuIconRectShape;

export const menuIconShapeListByName: Record<string, MenuIconShape[]> = {
  [MenuIconName.HOME]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M4 11.5 12 5l8 6.5' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M7 10.5V19h10v-8.5' },
  ],
  [MenuIconName.MEMBER]: [
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 9, centerY: 8, radius: 2.4 },
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 16, centerY: 9.2, radius: 2 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M4.8 18.4c.8-2.4 2.4-3.6 4.2-3.6s3.4 1.2 4.2 3.6' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M13.5 14.8c1.1-.3 2.2-.2 3.2.5 1 .9 1.5 2.1 1.7 3.1' },
  ],
  [MenuIconName.MEMBER_QUERY]: [
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 11, centerY: 11, radius: 5.5 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'm15.2 15.2 4.3 4.3' },
  ],
  [MenuIconName.MEMBER_RECHARGE]: [
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 3.5, offsetY: 6, width: 17, height: 12, cornerRadius: 2 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M3.5 10h17' },
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 16, centerY: 14.2, radius: 1.2 },
  ],
  [MenuIconName.FINANCE]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M4 19V5' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M4 19h16' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'm8 15 3-4 3 2 4-6' },
  ],
  [MenuIconName.FINANCE_BILL]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M7 3.5h10v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4z' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M9.5 8h5M9.5 12h5' },
  ],
  [MenuIconName.KTV]: [
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 9, offsetY: 3.5, width: 6, height: 10, cornerRadius: 3 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M7 11a5 5 0 0 0 10 0' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M12 16v4M9 20h6' },
  ],
  [MenuIconName.KTV_SHOP]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M4 10h16' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'm5.2 10 1.4-4.5h10.8L18.8 10' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M6 10v8h12v-8' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M10 18v-4h4v4' },
  ],
  [MenuIconName.KTV_ROOM]: [
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 4.5, offsetY: 4, width: 15, height: 16, cornerRadius: 1.5 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M12 4v16' },
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 9.2, centerY: 12, radius: 0.8 },
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 14.8, centerY: 12, radius: 0.8 },
  ],
  [MenuIconName.KTV_ROOM_OPEN]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M14 4h3.2A1.8 1.8 0 0 1 19 5.8V20' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M5 20h3' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M14 20h5' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M14 4.7v15a1 1 0 0 1-1.22.98L6.4 19.1V6.2a1.6 1.6 0 0 1 1.22-1.56l4.9-.76A1.6 1.6 0 0 1 14 4.7z' },
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 11.1, centerY: 12.4, radius: 0.7 },
  ],
  [MenuIconName.KTV_ROOM_CLEAN]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M14.8 3.2 10.2 13' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M6.6 13.2h7.2' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M7.6 13.2 6.2 20.4' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M10.2 13.2 9.6 20.4' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M12.8 13.2 13.4 20.4' },
  ],
  [MenuIconName.KTV_ROOM_IDLE]: [
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 4.5, offsetY: 4.5, width: 15, height: 15, cornerRadius: 2 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'm8.2 12.2 2.5 2.5 5.1-5.2' },
  ],
  [MenuIconName.KTV_VERIFY]: [
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 12, centerY: 12, radius: 8 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'm8.5 12.2 2.5 2.4 4.8-5.1' },
  ],
  [MenuIconName.HOTEL]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M4 20h16' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M6 20V7l6-3 6 3v13' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M10 10h.01M14 10h.01M10 14h.01M14 14h.01' },
  ],
  [MenuIconName.HOTEL_ROOM_TYPE]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M4 17V11a2 2 0 0 1 2-2h2.2' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M4 17h16' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M20 17v-4a2 2 0 0 0-2-2H10' },
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 8, centerY: 11.2, radius: 1.3 },
  ],
  [MenuIconName.HOTEL_ROOM]: [
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 6, offsetY: 3.5, width: 12, height: 17, cornerRadius: 1.4 },
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 15, centerY: 12, radius: 0.8 },
  ],
  [MenuIconName.HOTEL_STAY]: [
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 8, centerY: 12, radius: 3.2 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M11 12h9' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M17 12v2.4M20 12v2' },
  ],
  [MenuIconName.SYSTEM]: [
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 12, centerY: 12, radius: 3 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'm6.2 6.2 1.6 1.6M16.2 16.2l1.6 1.6M17.8 6.2l-1.6 1.6M7.8 16.2 6.2 17.8' },
  ],
  [MenuIconName.SYSTEM_USER]: [
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 12, centerY: 8, radius: 3 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M6 19c1.2-2.6 3-3.8 6-3.8s4.8 1.2 6 3.8' },
  ],
  [MenuIconName.SYSTEM_ROLE]: [
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 8, centerY: 15, radius: 2.2 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M10.2 15H18l1.6-1.6M15.2 15v2.2' },
  ],
  [MenuIconName.MENU_EXPAND]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'm5 6 6 6-6 6' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'm13 6 6 6-6 6' },
  ],
  [MenuIconName.MENU_COLLAPSE]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'm11 6-6 6 6 6' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'm19 6-6 6 6 6' },
  ],
  [MenuIconName.MENU_HAMBURGER]: [{ shapeKind: MenuIconShapeKind.PATH, pathData: 'M4 7h16M4 12h16M4 17h16' }],
  [MenuIconName.LOGIN_ACCOUNT]: [
    { shapeKind: MenuIconShapeKind.CIRCLE, centerX: 12, centerY: 8, radius: 3.2 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M5.5 19.2c1.2-3 3.5-4.5 6.5-4.5s5.3 1.5 6.5 4.5' },
  ],
  [MenuIconName.LOGIN_PASSWORD]: [
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 5, offsetY: 10.5, width: 14, height: 9, cornerRadius: 1.6 },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M8.2 10.5V8.2a3.8 3.8 0 0 1 7.6 0v2.3' },
  ],
  [MenuIconName.SCAN_QR]: [
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 3.5, offsetY: 3.5, width: 6.5, height: 6.5, cornerRadius: 1 },
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 14, offsetY: 3.5, width: 6.5, height: 6.5, cornerRadius: 1 },
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 3.5, offsetY: 14, width: 6.5, height: 6.5, cornerRadius: 1 },
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 14, offsetY: 14, width: 2.2, height: 2.2, cornerRadius: 0.4 },
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 17.6, offsetY: 14, width: 2.2, height: 2.2, cornerRadius: 0.4 },
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 14, offsetY: 17.6, width: 2.2, height: 2.2, cornerRadius: 0.4 },
    { shapeKind: MenuIconShapeKind.RECT, offsetX: 17.6, offsetY: 17.6, width: 2.2, height: 2.2, cornerRadius: 0.4 },
  ],
  [MenuIconName.ARROW_RIGHT]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M5 12h14' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'm13 6 6 6-6 6' },
  ],
  [MenuIconName.REFRESH]: [
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M20 12a8 8 0 1 1-2.2-5.6' },
    { shapeKind: MenuIconShapeKind.PATH, pathData: 'M20 4.2V9h-4.8' },
  ],
};
