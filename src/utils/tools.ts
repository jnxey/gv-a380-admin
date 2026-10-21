/**
 * 判断值是否为空。
 */
export function isEmpty(value: unknown): value is null | undefined | '' {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  return false;
}

/**
 * 把两位数字补成两位文本。
 */
function padDateTimePart(dateTimePart: number): string {
  return String(dateTimePart).padStart(2, '0');
}

/**
 * 用电脑本地的年月日时分秒拼成统一文本。
 */
function formatLocalDateTimeText(dateTime: Date): string {
  const yearText = String(dateTime.getFullYear());
  const monthText = padDateTimePart(dateTime.getMonth() + 1);
  const dayText = padDateTimePart(dateTime.getDate());
  const hourText = padDateTimePart(dateTime.getHours());
  const minuteText = padDateTimePart(dateTime.getMinutes());
  const secondText = padDateTimePart(dateTime.getSeconds());
  return `${yearText}-${monthText}-${dayText} ${hourText}:${minuteText}:${secondText}`;
}

/**
 * 把接口里的日期时间格式化成电脑本地时间。纯日期和钟点原样返回。
 */
export function formatLocalDateTime(dateTimeText: string): string {
  if (isEmpty(dateTimeText)) {
    return '';
  }
  const trimmedDateTime = dateTimeText.trim();
  // 1. 带 T 或 Z 的是时间戳，按电脑本地时区输出
  if (trimmedDateTime.includes('T') || trimmedDateTime.endsWith('Z')) {
    const parsedMilliseconds = Date.parse(trimmedDateTime);
    if (Number.isNaN(parsedMilliseconds)) {
      return trimmedDateTime;
    }
    return formatLocalDateTimeText(new Date(parsedMilliseconds));
  }
  // 2. 没有时区的日期时间按本地钟面拆开，并去掉小数秒
  if (trimmedDateTime.length >= 19 && trimmedDateTime.charAt(10) === ' ') {
    const datePartList = trimmedDateTime.slice(0, 10).split('-');
    const timePartList = trimmedDateTime.slice(11).split(':');
    const year = Number(datePartList[0]);
    const month = Number(datePartList[1]);
    const day = Number(datePartList[2]);
    const hour = Number(timePartList[0]);
    const minute = Number(timePartList[1]);
    const secondSource = isEmpty(timePartList[2]) ? '0' : timePartList[2].split('.')[0];
    const second = Number(secondSource);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(hour) || Number.isNaN(minute) || Number.isNaN(second)) {
      return trimmedDateTime;
    }
    return formatLocalDateTimeText(new Date(year, month - 1, day, hour, minute, second));
  }
  return trimmedDateTime;
}
