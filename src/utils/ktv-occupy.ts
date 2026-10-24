import { KtvOccupyRemind, KtvRoomStatus } from './constants';
import { isEmpty } from './tools';

export interface KtvOccupyRoomLike {
  roomStatus: string;
  occupyEndAt: string | null;
  occupyExtendHours?: number;
}

/**
 * 把包厢结束时间解析成本地毫秒。接口里的时间带时区，按原样解析；无法解析时返回 NaN。
 */
export function occupyEndMs(occupyEndAt: string): number {
  const dateTimeText = occupyEndAt.trim();
  // 1. 带 T 或 Z 的是接口序列化后的时间，不能把秒后面的时区当成数字
  if (dateTimeText.includes('T') || dateTimeText.endsWith('Z')) {
    const parsedMs = Date.parse(dateTimeText);
    if (Number.isNaN(parsedMs)) {
      return Number.NaN;
    }
    return parsedMs;
  }
  // 2. 纯日期时间按本地钟面拆开
  const datePartList = dateTimeText.slice(0, 10).split('-');
  const timePartList = dateTimeText.slice(11).split(':');
  const year = Number(datePartList[0]);
  const month = Number(datePartList[1]);
  const day = Number(datePartList[2]);
  const hour = Number(timePartList[0]);
  const minute = Number(timePartList[1]);
  const secondText = isEmpty(timePartList[2]) ? '0' : timePartList[2].split('.')[0];
  const second = Number(secondText);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(hour) || Number.isNaN(minute) || Number.isNaN(second)) {
    return Number.NaN;
  }
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

/**
 * 结束钟点。不是今天就写成次日。
 */
export function occupyEndClockText(occupyEndAt: string, nowMs: number): string {
  const endAt = new Date(occupyEndMs(occupyEndAt));
  const now = new Date(nowMs);
  const hourText = String(endAt.getHours()).padStart(2, '0');
  const minuteText = String(endAt.getMinutes()).padStart(2, '0');
  const endClock = `${hourText}:${minuteText}`;
  const sameDay = endAt.getFullYear() === now.getFullYear() && endAt.getMonth() === now.getMonth() && endAt.getDate() === now.getDate();
  if (sameDay) {
    return `${endClock} 结束`;
  }
  return `次日 ${endClock} 结束`;
}

/**
 * 临近或超时的提醒句。还早于提醒窗口时为空。
 */
export function occupyRemindText(occupyEndAt: string, nowMs: number): string {
  const endMs = occupyEndMs(occupyEndAt);
  if (Number.isNaN(endMs)) {
    return '';
  }
  const remainMilliseconds = endMs - nowMs;
  const leadMilliseconds = KtvOccupyRemind.LEAD_MINUTES * KtvOccupyRemind.MINUTE_MILLISECONDS;
  if (remainMilliseconds > leadMilliseconds) {
    return '';
  }
  if (remainMilliseconds > 0) {
    const remainMinutes = Math.ceil(remainMilliseconds / KtvOccupyRemind.MINUTE_MILLISECONDS);
    return `还剩 ${remainMinutes} 分钟`;
  }
  if (-remainMilliseconds < KtvOccupyRemind.MINUTE_MILLISECONDS) {
    return '已到点';
  }
  const overtimeMinutes = Math.floor(-remainMilliseconds / KtvOccupyRemind.MINUTE_MILLISECONDS);
  return `已超时 ${overtimeMinutes} 分钟`;
}

/**
 * 卡片上的到点钟点。不是使用中或没有结束时间时为空。
 */
export function roomOccupyEndText(roomRow: KtvOccupyRoomLike): string {
  if (roomRow.roomStatus !== KtvRoomStatus.IN_USE || isEmpty(roomRow.occupyEndAt)) {
    return '';
  }
  const endMs = occupyEndMs(roomRow.occupyEndAt);
  if (Number.isNaN(endMs)) {
    return '';
  }
  return occupyEndClockText(roomRow.occupyEndAt, Date.now());
}

/**
 * 卡片上的临近或超时提醒。不是使用中或没有结束时间时为空。
 */
export function roomOccupyRemindText(roomRow: KtvOccupyRoomLike): string {
  if (roomRow.roomStatus !== KtvRoomStatus.IN_USE || isEmpty(roomRow.occupyEndAt)) {
    return '';
  }
  return occupyRemindText(roomRow.occupyEndAt, Date.now());
}

/**
 * 使用中包厢累计延长的小时。没有延长或不是使用中时为空。
 */
export function roomExtendHourText(roomRow: KtvOccupyRoomLike): string {
  if (roomRow.roomStatus !== KtvRoomStatus.IN_USE) {
    return '';
  }
  const extendHours = Number(roomRow.occupyExtendHours);
  if (Number.isInteger(extendHours) !== true || extendHours <= 0) {
    return '';
  }
  return `已延长 ${extendHours} 小时`;
}

/**
 * 从当前到期往后加固定小时后的到期文案。无法计算时返回短横线。
 */
export function extendAfterOccupyEndText(occupyEndAt: string | null | undefined, extendHours: number): string {
  if (isEmpty(occupyEndAt)) {
    return '-';
  }
  const endMs = occupyEndMs(occupyEndAt);
  if (Number.isNaN(endMs)) {
    return '-';
  }
  const afterEndMs = endMs + extendHours * 60 * 60 * 1000;
  const afterEndAt = new Date(afterEndMs);
  const year = afterEndAt.getFullYear();
  const month = String(afterEndAt.getMonth() + 1).padStart(2, '0');
  const day = String(afterEndAt.getDate()).padStart(2, '0');
  const hour = String(afterEndAt.getHours()).padStart(2, '0');
  const minute = String(afterEndAt.getMinutes()).padStart(2, '0');
  const second = String(afterEndAt.getSeconds()).padStart(2, '0');
  return occupyEndClockText(`${year}-${month}-${day} ${hour}:${minute}:${second}`, Date.now());
}
