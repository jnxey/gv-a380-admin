<template>
  <el-button :disabled="disabled === true || scanning === true" type="warning" @click="scanOnce">
    <slot>扫码</slot>
  </el-button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { isEmpty } from '../../utils/tools';
import { readScanText } from '../ScanGunPrompt/read-scan-text';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  {
    disabled: false
  }
);

const emit = defineEmits<{
  scanned: [value: string];
}>();

const scanning = ref(false);

/**
 * 点一次扫码。有结果才通知外层。
 */
async function scanOnce(): Promise<void> {
  if (props.disabled === true || scanning.value === true) {
    return;
  }
  scanning.value = true;
  try {
    const scanText = await readScanText();
    if (isEmpty(scanText)) {
      return;
    }
    emit('scanned', scanText);
  } finally {
    scanning.value = false;
  }
}
</script>
