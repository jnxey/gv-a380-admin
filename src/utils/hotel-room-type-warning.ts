import { HotelRoomStatus } from './constants';
import { isEmpty } from './tools';

export interface HotelRoomTypeForWarning {
  id: string;
  typeName: string;
}

export interface HotelBookedOrderForWarning {
  roomTypeId: string;
}

export interface HotelIdleRoomForWarning {
  roomTypeId: string;
  roomStatus: string;
}

export interface HotelRoomTypeWarningItem {
  roomTypeId: string;
  warningText: string;
}

/**
 * 按已预订单数和空闲间数生成提示。还剩 1 间、刚好达到、已经超过各一句。
 */
export function hotelRoomTypeWarningText(
  roomType: HotelRoomTypeForWarning,
  bookedOrderList: HotelBookedOrderForWarning[],
  roomList: HotelIdleRoomForWarning[],
): string {
  const bookedCount = bookedOrderList.filter((orderRow) => orderRow.roomTypeId === roomType.id).length;
  const idleCount = roomList.filter((roomRow) => {
    return roomRow.roomTypeId === roomType.id && roomRow.roomStatus === HotelRoomStatus.IDLE;
  }).length;
  if (bookedCount === 0) {
    return '';
  }
  const freeLeft = idleCount - bookedCount;
  if (freeLeft === 1) {
    return `${roomType.typeName}已预订 ${bookedCount} 单，空闲 ${idleCount} 间，还剩 1 间`;
  }
  if (bookedCount === idleCount) {
    return `${roomType.typeName}已预订 ${bookedCount} 单，已达到空闲房间 ${idleCount} 间`;
  }
  if (bookedCount > idleCount) {
    return `${roomType.typeName}已预订 ${bookedCount} 单，已超过空闲房间 ${idleCount} 间`;
  }
  return '';
}

/**
 * 已预订单数接近或超过空闲房间时的提示列表。
 */
export function buildHotelRoomTypeWarningList(
  roomTypeList: HotelRoomTypeForWarning[],
  bookedOrderList: HotelBookedOrderForWarning[],
  roomList: HotelIdleRoomForWarning[],
): HotelRoomTypeWarningItem[] {
  const warningList: HotelRoomTypeWarningItem[] = [];
  roomTypeList.forEach((roomType) => {
    const warningText = hotelRoomTypeWarningText(roomType, bookedOrderList, roomList);
    if (isEmpty(warningText)) {
      return;
    }
    warningList.push({
      roomTypeId: roomType.id,
      warningText,
    });
  });
  return warningList;
}
