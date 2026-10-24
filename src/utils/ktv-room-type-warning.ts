import { KtvRoomStatus } from './constants';
import { isEmpty } from './tools';

export interface PendingBookingForWarning {
  roomTypeId: string;
  roomTypeName: string;
  bookingDate: string;
  startTime: string;
  durationHours: number;
}

export interface IdleRoomForWarning {
  roomTypeId: string;
  roomStatus: string;
}

export interface PendingTypeCountItem {
  roomTypeId: string;
  typeName: string;
  count: number;
}

export interface RoomTypeWarningItem {
  roomTypeId: string;
  warningText: string;
}

interface BookingRangePoint {
  timeMs: number;
  changeCount: number;
}

/**
 * 待核销订单按包厢类型计数。
 */
export function buildPendingTypeCountList(pendingBookingList: PendingBookingForWarning[]): PendingTypeCountItem[] {
  const pendingTypeCountMap = new Map<string, PendingTypeCountItem>();
  pendingBookingList.forEach((pendingOrder) => {
    const pendingTypeCount = pendingTypeCountMap.get(pendingOrder.roomTypeId);
    if (pendingTypeCount === undefined) {
      pendingTypeCountMap.set(pendingOrder.roomTypeId, {
        roomTypeId: pendingOrder.roomTypeId,
        typeName: pendingOrder.roomTypeName,
        count: 1,
      });
      return;
    }
    pendingTypeCount.count += 1;
  });
  return Array.from(pendingTypeCountMap.values());
}

/**
 * 开唱时刻的本地毫秒。用年月日分开构造，避免把日期串当成 UTC。
 */
function bookingStartMs(pendingOrder: PendingBookingForWarning): number {
  const datePartList = pendingOrder.bookingDate.slice(0, 10).split('-');
  const timePartList = pendingOrder.startTime.split(':');
  const year = Number(datePartList[0]);
  const month = Number(datePartList[1]);
  const day = Number(datePartList[2]);
  const hour = Number(timePartList[0]);
  const minute = Number(timePartList[1]);
  const second = Number(timePartList[2] || '0');
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

/**
 * 计算同一包厢类型里，待核销订单在同一时刻最多叠几单。相邻小时不算重叠。
 */
function peakPendingCount(bookingOrderList: PendingBookingForWarning[]): number {
  if (isEmpty(bookingOrderList)) {
    return 0;
  }
  // 1. 每张订单拆成开唱加一、结束减一
  const pointList: BookingRangePoint[] = [];
  bookingOrderList.forEach((pendingOrder) => {
    const startMs = bookingStartMs(pendingOrder);
    const endMs = startMs + pendingOrder.durationHours * 60 * 60 * 1000;
    pointList.push({ timeMs: startMs, changeCount: 1 });
    pointList.push({ timeMs: endMs, changeCount: -1 });
  });
  // 2. 同一时刻先结束再开唱，相邻小时不叠在一起
  pointList.sort((leftPoint, rightPoint) => {
    if (leftPoint.timeMs !== rightPoint.timeMs) {
      return leftPoint.timeMs - rightPoint.timeMs;
    }
    return leftPoint.changeCount - rightPoint.changeCount;
  });
  // 3. 扫一遍，留下同时在场的最大单数
  let currentCount = 0;
  let peakCount = 0;
  pointList.forEach((point) => {
    currentCount += point.changeCount;
    if (currentCount > peakCount) {
      peakCount = currentCount;
    }
  });
  return peakCount;
}

/**
 * 按剩余空闲间数生成提示。还剩 1 间、刚好达到、已经超过各一句。
 */
function roomTypeWarningMessage(typeName: string, peakCount: number, idleCount: number, freeLeft: number): string {
  if (freeLeft === 1) {
    return `${typeName}同一时段待核销 ${peakCount} 单，空闲 ${idleCount} 间，还剩 1 间`;
  }
  if (peakCount === idleCount) {
    return `${typeName}同一时段待核销 ${peakCount} 单，已达到空闲包厢 ${idleCount} 间`;
  }
  return `${typeName}同一时段待核销 ${peakCount} 单，已超过空闲包厢 ${idleCount} 间`;
}

/**
 * 同一时段待核销单快占满或已经占满空闲包厢时给出提示。
 */
export function buildRoomTypeWarningList(
  pendingBookingList: PendingBookingForWarning[],
  roomList: IdleRoomForWarning[],
  pendingTypeCountList: PendingTypeCountItem[],
): RoomTypeWarningItem[] {
  const roomTypeIdList = pendingTypeCountList.map((pendingTypeCount) => pendingTypeCount.roomTypeId);
  return roomTypeIdList.flatMap((roomTypeId) => {
    const typeOrderList = pendingBookingList.filter((pendingOrder) => pendingOrder.roomTypeId === roomTypeId);
    const peakCount = peakPendingCount(typeOrderList);
    if (peakCount === 0) {
      return [];
    }
    const idleCount = roomList.filter((roomRow) => {
      return roomRow.roomTypeId === roomTypeId && roomRow.roomStatus === KtvRoomStatus.IDLE;
    }).length;
    const freeLeft = idleCount - peakCount;
    if (freeLeft > 1) {
      return [];
    }
    const firstPendingOrder = typeOrderList[0];
    if (isEmpty(firstPendingOrder)) {
      return [];
    }
    return [
      {
        roomTypeId,
        warningText: roomTypeWarningMessage(firstPendingOrder.roomTypeName, peakCount, idleCount, freeLeft),
      },
    ];
  });
}

/**
 * 取出某个包厢类型的订满提示。没有提示时返回空字符串。
 */
export function roomTypeWarningText(roomTypeWarningList: RoomTypeWarningItem[], roomTypeId: string): string {
  const roomTypeWarning = roomTypeWarningList.find((item) => item.roomTypeId === roomTypeId);
  if (isEmpty(roomTypeWarning)) {
    return '';
  }
  return roomTypeWarning.warningText;
}
