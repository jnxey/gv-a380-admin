import { openScanGun } from './scan-gun';
import { readScanCode } from '../../utils/gv-sdk';

const narrowScreenQuery = window.matchMedia('(max-width: 768px)');

/**
 * 读一次扫码结果。窄屏且宿主提供扫码时用相机，否则等扫码枪。取消或失败返回空字符串。
 */
export async function readScanText(): Promise<string> {
  const scanCode = readScanCode();
  if (narrowScreenQuery.matches === true && scanCode !== null) {
    try {
      const scanResult = await scanCode();
      if (typeof scanResult !== 'string') {
        return '';
      }
      return scanResult.trim();
    } catch (error) {
      if (error instanceof Error && error.message === 'cancelled') {
        return '';
      }
      return '';
    }
  }
  return openScanGun();
}
