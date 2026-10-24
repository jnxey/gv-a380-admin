import { ref, type Ref } from 'vue';

/**
 * 保存类操作的 loading。执行期间 saving 为 true，结束或失败都会关掉。
 */
export function useSaving(): {
  saving: Ref<boolean>;
  runSaving: (action: () => Promise<void>) => Promise<void>;
} {
  const saving = ref(false);

  /**
   * 包一层异步保存，自动开关 loading。
   */
  async function runSaving(action: () => Promise<void>): Promise<void> {
    saving.value = true;
    try {
      await action();
    } finally {
      saving.value = false;
    }
  }

  return {
    saving,
    runSaving,
  };
}
