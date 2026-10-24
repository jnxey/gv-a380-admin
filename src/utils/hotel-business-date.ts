import { HotelBusinessDay } from './constants';
import { isEmpty } from './tools';

/**
 * 把门店时区偏移换成分钟。没有偏移或写错时用东八区。
 */
export function timeZoneOffsetMinutes(timeZoneOffset: string): number {
  const offsetText = isEmpty(timeZoneOffset) ? HotelBusinessDay.DEFAULT_TIME_ZONE_OFFSET : timeZoneOffset;
  const signText = offsetText.slice(0, 1);
  const hourText = offsetText.slice(1, 3);
  const minuteText = offsetText.slice(4, 6);
  if (isEmpty(hourText) || isEmpty(minuteText)) {
    if (offsetText === HotelBusinessDay.DEFAULT_TIME_ZONE_OFFSET) {
      return HotelBusinessDay.DEFAULT_OFFSET_MINUTES;
    }
    return timeZoneOffsetMinutes(HotelBusinessDay.DEFAULT_TIME_ZONE_OFFSET);
  }
  const hourNumber = Number(hourText);
  const minuteNumber = Number(minuteText);
  if (Number.isFinite(hourNumber) !== true || Number.isFinite(minuteNumber) !== true) {
    if (offsetText === HotelBusinessDay.DEFAULT_TIME_ZONE_OFFSET) {
      return HotelBusinessDay.DEFAULT_OFFSET_MINUTES;
    }
    return timeZoneOffsetMinutes(HotelBusinessDay.DEFAULT_TIME_ZONE_OFFSET);
  }
  const absoluteMinutes = hourNumber * 60 + minuteNumber;
  if (signText === '-') {
    return -absoluteMinutes;
  }
  return absoluteMinutes;
}

/**
 * 把当前时刻平移成门店钟面。日期和钟点读 UTC 字段，避免本机时区。
 */
export function toShopWallClock(now: Date, timeZoneOffset: string): Date {
  const offsetMinutes = timeZoneOffsetMinutes(timeZoneOffset);
  const offsetMilliseconds = offsetMinutes * HotelBusinessDay.MILLISECONDS_PER_MINUTE;
  return new Date(now.getTime() + offsetMilliseconds);
}

/**
 * 把 UTC 日期格式化成 YYYY-MM-DD。
 */
export function formatUtcDate(date: Date): string {
  const yearText = String(date.getUTCFullYear());
  const monthText = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dayText = String(date.getUTCDate()).padStart(2, '0');
  return `${yearText}-${monthText}-${dayText}`;
}

/**
 * 门店当地的入住日。早上切点前仍算前一天。
 */
export function hotelBusinessDateText(now: Date, timeZoneOffset: string): string {
  const shopNow = toShopWallClock(now, timeZoneOffset);
  let businessTime = shopNow.getTime();
  if (shopNow.getUTCHours() < HotelBusinessDay.START_HOUR) {
    businessTime -= HotelBusinessDay.MILLISECONDS_PER_DAY;
  }
  return formatUtcDate(new Date(businessTime));
}
