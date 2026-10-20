type ScanGunFinish = (cipherText: string) => void;

let beginScanGun: (() => void) | null = null;
let finishScanGun: ScanGunFinish | null = null;

/**
 * 挂上全局扫码枪浮窗。页面卸载时再摘掉。
 */
export function registerScanGun(begin: () => void): void {
  beginScanGun = begin;
}

/**
 * 摘掉扫码枪浮窗，避免卸载后还被调用。
 */
export function unregisterScanGun(): void {
  beginScanGun = null;
  finishScanGun = null;
}

/**
 * 结束这一次扫码。空字符串表示焦点离开，没有扫成。
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
 * 打开扫码枪浮窗，等扫码枪以换行结束。没挂上浮窗、已经在扫，或中途失焦时返回空字符串。
 */
export function openScanGun(): Promise<string> {
  if (beginScanGun === null || finishScanGun !== null) {
    return Promise.resolve('');
  }
  return new Promise((resolve) => {
    finishScanGun = resolve;
    beginScanGun?.();
  });
}
