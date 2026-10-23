import { openScanGun } from './scan-gun';
import { readScanCode } from '../../utils/gv-sdk';

/**
 * 读一次扫码结果。宿主提供 GV_SDK.scanCode 时用相机，否则等扫码枪。取消或失败返回空字符串。
 * container 仅在走扫码枪时生效，用于限定浮层覆盖区域。
 */
export async function readScanText(container?: HTMLElement | null): Promise<string> {
  const scanCode = readScanCode();
  if (scanCode !== null) {
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
  return openScanGun(container);
}
