import { isEmpty } from './tools';

type GvSdkBridge = {
  enterApp?: () => Promise<unknown> | void;
  scanCode?: () => Promise<unknown>;
};

/** 已经通知过宿主进入应用。 */
let miniProgramEntered = false;

/**
 * 首屏准备好后通知宿主关掉小程序加载动画。
 * 浏览器里没有 GV_SDK 时不调用；SDK 晚到则等 gv-sdk-ready。只通知一次，失败不提示。
 */
export function enterMiniProgramApp(): void {
  tryEnterMiniProgramApp();
  if (miniProgramEntered) {
    return;
  }
  window.addEventListener('gv-sdk-ready', tryEnterMiniProgramApp);
}

/**
 * SDK 已就绪时调用 enterApp。未就绪则留下一次监听。
 */
function tryEnterMiniProgramApp(): void {
  if (miniProgramEntered) {
    return;
  }
  const bridge = readGvSdk();
  if (bridge === null || typeof bridge.enterApp !== 'function') {
    return;
  }
  miniProgramEntered = true;
  window.removeEventListener('gv-sdk-ready', tryEnterMiniProgramApp);
  Promise.resolve(bridge.enterApp()).catch(() => undefined);
}

/**
 * 宿主提供扫码时返回这个方法。没有注入或还没有扫码方法时返回 null。
 */
export function readScanCode(): (() => Promise<unknown>) | null {
  const bridge = readGvSdk();
  const scanCode = bridge?.scanCode;
  if (typeof scanCode !== 'function') {
    return null;
  }
  return () => scanCode();
}

/**
 * 读取宿主注入的 SDK。没有注入时返回 null。
 */
function readGvSdk(): GvSdkBridge | null {
  const bridge = (window as Window & { GV_SDK?: GvSdkBridge }).GV_SDK;
  if (isEmpty(bridge)) {
    return null;
  }
  return bridge;
}
