<template>
  <div v-if="sessionActive" class="scan-gun-layer" @mousedown.self="cancelScan">
    <div ref="scanCard" class="scan-gun-card" tabindex="-1" @blur="onCardBlur">
      <p class="scan-gun-text">扫码中</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { completeScanGun, registerScanGun, unregisterScanGun } from './scan-gun';
import { isEmpty } from '../../utils/tools';

const unshiftedCharByCode: Record<string, string> = {
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
  Space: ' ',
  Numpad0: '0',
  Numpad1: '1',
  Numpad2: '2',
  Numpad3: '3',
  Numpad4: '4',
  Numpad5: '5',
  Numpad6: '6',
  Numpad7: '7',
  Numpad8: '8',
  Numpad9: '9',
  NumpadAdd: '+',
  NumpadSubtract: '-',
  NumpadMultiply: '*',
  NumpadDivide: '/',
  NumpadDecimal: '.',
};

const shiftedCharByCode: Record<string, string> = {
  Digit0: ')',
  Digit1: '!',
  Digit2: '@',
  Digit3: '#',
  Digit4: '$',
  Digit5: '%',
  Digit6: '^',
  Digit7: '&',
  Digit8: '*',
  Digit9: '(',
  Minus: '_',
  Equal: '+',
  BracketLeft: '{',
  BracketRight: '}',
  Backslash: '|',
  Semicolon: ':',
  Quote: '"',
  Comma: '<',
  Period: '>',
  Slash: '?',
  Backquote: '~',
  Space: ' ',
  NumpadAdd: '+',
  NumpadSubtract: '-',
  NumpadMultiply: '*',
  NumpadDivide: '/',
  NumpadDecimal: '.',
};

for (let letterCode = 65; letterCode <= 90; letterCode += 1) {
  const letter = String.fromCharCode(letterCode);
  unshiftedCharByCode[`Key${letter}`] = letter.toLowerCase();
  shiftedCharByCode[`Key${letter}`] = letter;
}

/**
 * 按美式键盘的物理键还原一个字符。不看输入法组出来的字，也不看 Caps Lock。
 */
function readEnglishScanChar(keyboardEvent: KeyboardEvent): string {
  const charByCode = keyboardEvent.shiftKey ? shiftedCharByCode : unshiftedCharByCode;
  return charByCode[keyboardEvent.code] ?? '';
}

const sessionActive = ref(false);
const scanCard = ref<HTMLElement | null>(null);
let scanSettled = false;
let scanBuffer = '';

/**
 * 打开浮窗，让提示卡片拿到焦点，并开始听键盘。
 */
function beginScan(): void {
  scanSettled = false;
  scanBuffer = '';
  sessionActive.value = true;
  document.addEventListener('keydown', onScanKeydown, true);
  window.addEventListener('blur', cancelScan);
  void nextTick(() => {
    const card = scanCard.value;
    card?.focus();
    if (sessionActive.value !== true) {
      return;
    }
    if (card === null || document.activeElement !== card) {
      cancelScan();
      return;
    }
    document.addEventListener('focusin', onFocusIn, true);
  });
}

/**
 * 焦点进到卡片外面时关掉浮窗。
 */
function onFocusIn(focusEvent: FocusEvent): void {
  const card = scanCard.value;
  const target = focusEvent.target;
  if (card !== null && target instanceof Node && (target === card || card.contains(target))) {
    return;
  }
  cancelScan();
}

/**
 * 焦点离开提示卡片时，当作没扫成。已经交过结果时不再交一次空串。
 */
function onCardBlur(): void {
  if (scanSettled || sessionActive.value !== true) {
    return;
  }
  void nextTick(() => {
    const card = scanCard.value;
    if (scanSettled || sessionActive.value !== true) {
      return;
    }
    if (card !== null && (document.activeElement === card || card.contains(document.activeElement))) {
      return;
    }
    cancelScan();
  });
}

/**
 * 收起浮窗，并停掉这一轮的键盘监听。
 */
function closeScanGun(): void {
  sessionActive.value = false;
  scanBuffer = '';
  document.removeEventListener('keydown', onScanKeydown, true);
  document.removeEventListener('focusin', onFocusIn, true);
  window.removeEventListener('blur', cancelScan);
}

/**
 * 焦点离开卡片、点在提示外面，或窗口失焦时，关掉浮窗。
 */
function cancelScan(): void {
  if (sessionActive.value !== true) {
    return;
  }
  scanSettled = true;
  closeScanGun();
  completeScanGun('');
}

/**
 * 拦住按键，不让它进到页面上的输入框。认得出的物理键自己拼上，换行表示扫完。
 */
function onScanKeydown(keyboardEvent: KeyboardEvent): void {
  if (sessionActive.value !== true) {
    return;
  }
  keyboardEvent.preventDefault();
  keyboardEvent.stopPropagation();
  if (keyboardEvent.repeat) {
    return;
  }
  if (keyboardEvent.code === 'Enter' || keyboardEvent.code === 'NumpadEnter') {
    finishByEnter();
    return;
  }
  const scanChar = readEnglishScanChar(keyboardEvent);
  if (scanChar === '') {
    return;
  }
  scanBuffer += scanChar;
}

/**
 * 扫码枪以换行结束。交出去的是物理键拼出来的字符。
 */
function finishByEnter(): void {
  const cipherText = scanBuffer.trim();
  if (isEmpty(cipherText)) {
    scanBuffer = '';
    return;
  }
  scanSettled = true;
  completeScanGun(cipherText);
  closeScanGun();
}

onMounted(() => {
  registerScanGun(beginScan);
});

onBeforeUnmount(() => {
  const scanning = sessionActive.value;
  closeScanGun();
  if (scanning && scanSettled !== true) {
    completeScanGun('');
  }
  unregisterScanGun();
});
</script>

<style scoped>
.scan-gun-layer {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 40, 0.45);
}

.scan-gun-card {
  min-width: 220px;
  outline: none;
  padding: 28px 36px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(16, 24, 40, 0.18);
}

.scan-gun-text {
  margin: 0;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
  color: #1c2434;
}
</style>
