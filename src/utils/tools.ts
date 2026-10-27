import { A380H5PagePath } from './constants';

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
 * 金额转成「分」。按字符串拆整元和小数，超过两位时四舍五入。不能解析时返回空。
 */
export function readMoneyCents(value: unknown): number | null {
  // @ts-ignore
  if (isEmpty(value) && value !== 0) {
    return null;
  }
  const amountText = String(value).trim();
  const matched = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amountText);
  if (matched === null) {
    return null;
  }
  const negative = matched[1] === '-';
  const wholeText = matched[2];
  const fractionText = isEmpty(matched[3]) ? '' : matched[3];
  const centPrefix = fractionText.padEnd(2, '0').slice(0, 2);
  let cents = Number(wholeText) * 100 + Number(centPrefix);
  if (fractionText.length > 2 && fractionText.charAt(2) >= '5') {
    cents += 1;
  }
  if (Number.isSafeInteger(cents) !== true) {
    return null;
  }
  if (negative) {
    return -cents;
  }
  return cents;
}

/**
 * 「分」转成展示金额，去掉末尾多余的 0。
 */
export function formatMoneyCents(cents: number): string {
  const negative = cents < 0;
  const absoluteCents = negative ? -cents : cents;
  const wholeAmount = Math.floor(absoluteCents / 100);
  const fractionCents = absoluteCents % 100;
  let amountText = String(wholeAmount);
  if (fractionCents > 0) {
    if (fractionCents % 10 === 0) {
      amountText = `${amountText}.${fractionCents / 10}`;
    } else if (fractionCents < 10) {
      amountText = `${amountText}.0${fractionCents}`;
    } else {
      amountText = `${amountText}.${fractionCents}`;
    }
  }
  if (negative && absoluteCents !== 0) {
    return `-${amountText}`;
  }
  return amountText;
}

/**
 * 展示金额。先按两位小数四舍五入，再去掉末尾多余的 0。
 */
export function formatMoney(value: unknown): string {
  const cents = readMoneyCents(value);
  if (cents === null) {
    if (isEmpty(value)) {
      return '';
    }
    return String(value);
  }
  return formatMoneyCents(cents);
}

/**
 * 把数量拆成整数和小数位数，供金额相乘时避免二进制浮点。
 */
function readDecimalScale(value: unknown): { scaled: number; scale: number } | null {
  // @ts-ignore
  if (isEmpty(value) && value !== 0) {
    return null;
  }
  const countText = String(value).trim();
  const matched = /^(-?)(\d+)(?:\.(\d+))?$/.exec(countText);
  if (matched === null) {
    return null;
  }
  const fractionText = isEmpty(matched[3]) ? '' : matched[3];
  const digits = `${matched[2]}${fractionText}`.replace(/^0+(?=\d)/, '');
  const scale = 10 ** fractionText.length;
  const scaled = Number(matched[1] === '-' ? `-${digits}` : digits);
  if (Number.isSafeInteger(scaled) !== true || Number.isSafeInteger(scale) !== true) {
    return null;
  }
  return { scaled, scale };
}

/**
 * 单价乘数量，结果是「分」。任一端不能解析时返回空。
 */
export function multiplyMoneyCents(unitAmount: unknown, count: unknown): number | null {
  const unitCents = readMoneyCents(unitAmount);
  const countScale = readDecimalScale(count);
  if (unitCents === null || countScale === null) {
    return null;
  }
  const negative = unitCents < 0 !== countScale.scaled < 0;
  const absoluteProduct = Math.abs(unitCents) * Math.abs(countScale.scaled);
  if (Number.isSafeInteger(absoluteProduct) !== true) {
    return null;
  }
  const quotient = Math.floor(absoluteProduct / countScale.scale);
  const remainder = absoluteProduct % countScale.scale;
  let lineCents = quotient;
  if (remainder * 2 >= countScale.scale) {
    lineCents += 1;
  }
  if (negative) {
    return -lineCents;
  }
  return lineCents;
}

/**
 * 单价乘数量后的展示金额。
 */
export function multiplyMoney(unitAmount: unknown, count: unknown): string {
  const lineCents = multiplyMoneyCents(unitAmount, count);
  if (lineCents === null) {
    return '';
  }
  return formatMoneyCents(lineCents);
}

/**
 * 两个金额相减后的展示金额。任一端不能解析时返回空字符串。
 */
export function subtractMoney(totalAmount: unknown, deductAmount: unknown): string {
  const totalCents = readMoneyCents(totalAmount);
  const deductCents = readMoneyCents(deductAmount);
  if (totalCents === null || deductCents === null) {
    return '';
  }
  return formatMoneyCents(totalCents - deductCents);
}

/**
 * 用临时输入框把文本写进剪贴板。非 HTTPS 时 Clipboard API 常不可用。
 */
function writeClipboardTextByInput(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'readonly');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, text.length);
  let copySucceeded = false;
  try {
    copySucceeded = document.execCommand('copy');
  } catch {
    copySucceeded = false;
  }
  document.body.removeChild(textArea);
  return copySucceeded;
}

/**
 * 把文本写进剪贴板。优先 Clipboard API，失败时用临时输入框。
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (isEmpty(text)) {
    return false;
  }
  if (window.isSecureContext === true && isEmpty(navigator.clipboard) !== true && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 继续用临时输入框降级
    }
  }
  return writeClipboardTextByInput(text);
}

/**
 * 拼出门店 H5 链接。用当前域名、线上应用前缀，哈希后面是页面路径和门店编码。
 */
export function buildA380H5ShopLink(pagePath: string, shopCode: string): string {
  const encodedShopCode = encodeURIComponent(shopCode);
  return `${window.location.origin}${A380H5PagePath.APP_PREFIX}${pagePath}/${encodedShopCode}`;
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
