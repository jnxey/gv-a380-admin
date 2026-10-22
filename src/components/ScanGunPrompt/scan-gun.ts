type ScanGunFinish = (cipherText: string) => void;
type BeginScanGun = (container: HTMLElement | null) => void;

let beginScanGun: BeginScanGun | null = null;
let abortScanGun: (() => void) | null = null;
let finishScanGun: ScanGunFinish | null = null;

/**
 * 挂上全局扫码枪浮窗。页面卸载时再摘掉。
 */
export function registerScanGun(begin: BeginScanGun, abort: () => void): void {
  beginScanGun = begin;
  abortScanGun = abort;
}

/**
 * 摘掉扫码枪浮窗，避免卸载后还被调用。
 */
export function unregisterScanGun(): void {
  beginScanGun = null;
  abortScanGun = null;
  finishScanGun = null;
}

/**
 * 结束这一次扫码。空字符串表示中途取消，没有扫成。
 */
export function completeScanGun(cipherText: string): void {
  const finish = finishScanGun;
  finishScanGun = null;
  if (finish === null) {
    return;
  }
  finish(cipherText);
}

/**
 * 打开扫码枪浮窗，等扫码枪以换行结束。没挂上浮窗、已经在扫，或中途取消时返回空字符串。
 * 传入 container 时，浮层只盖住该元素区域。
 */
export function openScanGun(container?: HTMLElement | null): Promise<string> {
  if (beginScanGun === null || finishScanGun !== null) {
    return Promise.resolve('');
  }
  return new Promise((resolve) => {
    finishScanGun = resolve;
    beginScanGun?.(container ?? null);
  });
}

/**
 * 取消当前这一轮扫码枪等待，收起浮窗并交回空字符串。
 */
export function cancelScanGun(): void {
  if (finishScanGun === null) {
    return;
  }
  abortScanGun?.();
}
