<template>
  <div v-if="sessionActive" class="scan-gun-layer" :class="{ 'is-focused': inputFocused }" @mousedown.self="releaseFocus">
    <div class="scan-gun-card" @mousedown.prevent>
      <p class="scan-gun-text">扫码中</p>
      <input
        ref="gunInput"
        v-model="gunText"
        class="scan-gun-input"
        tabindex="-1"
        autocomplete="off"
        aria-label="扫码枪输入"
        @focus="onInputFocus"
        @blur="onInputBlur"
        @keydown.enter.prevent="finishByEnter"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { completeScanGun, registerScanGun, unregisterScanGun } from './scan-gun';
import { isEmpty } from '../../utils/tools';

const sessionActive = ref(false);
const inputFocused = ref(false);
const gunText = ref('');
const gunInput = ref<HTMLInputElement | null>(null);
let scanSettled = false;

/**
 * 挂上浮窗并让隐藏输入框拿到焦点。拿到焦点才把浮窗亮出来。
 */
function beginScan(): void {
  scanSettled = false;
  gunText.value = '';
  inputFocused.value = false;
  sessionActive.value = true;
  void nextTick(() => {
    const input = gunInput.value;
    input?.focus();
    if (input === null || document.activeElement !== input) {
      closeScanGun();
      completeScanGun('');
      return;
    }
    inputFocused.value = true;
  });
}

/**
 * 隐藏输入框拿到焦点后才把浮窗亮出来。
 */
function onInputFocus(): void {
  inputFocused.value = true;
}

/**
 * 收起浮窗，并清掉这一轮扫到的字符。
 */
function closeScanGun(): void {
  inputFocused.value = false;
  sessionActive.value = false;
  gunText.value = '';
}

/**
 * 点在提示卡片外面时丢掉焦点，浮窗跟着收起。
 */
function releaseFocus(): void {
  if (sessionActive.value !== true) {
    return;
  }
  scanSettled = true;
  gunInput.value?.blur();
  closeScanGun();
  completeScanGun('');
  scanSettled = false;
}

/**
 * 焦点离开就关掉。已经用换行交过结果时不再交一次空串。
 */
function onInputBlur(): void {
  const settled = scanSettled;
  scanSettled = false;
  closeScanGun();
  if (settled) {
    return;
  }
  completeScanGun('');
}

/**
 * 扫码枪以换行结束。去掉首尾空白后交回去，并让输入框失焦。
 */
function finishByEnter(): void {
  const cipherText = (gunInput.value?.value ?? gunText.value).trim();
  if (isEmpty(cipherText)) {
    gunText.value = '';
    return;
  }
  scanSettled = true;
  completeScanGun(cipherText);
  closeScanGun();
  gunInput.value?.blur();
}

onMounted(() => {
  registerScanGun(beginScan);
});

onBeforeUnmount(() => {
  if (scanSettled !== true) {
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
  opacity: 0;
  pointer-events: none;
}

.scan-gun-layer.is-focused {
  opacity: 1;
  pointer-events: auto;
  background: rgba(16, 24, 40, 0.45);
}

.scan-gun-card {
  position: relative;
  min-width: 220px;
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

.scan-gun-input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  border: 0;
  opacity: 0;
}
</style>
