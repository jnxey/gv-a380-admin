<template>
  <article class="record-card" :class="{ 'is-selected': selected === true, 'is-selectable': selected !== undefined }">
    <div class="record-fields">
      <slot />
    </div>
    <div
      v-if="slotMap.actions !== undefined"
      class="record-actions"
      :class="{ 'is-empty': !actionSlotHasContent() }"
    >
      <slot name="actions" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { Comment, useSlots } from 'vue';

defineProps<{
  selected?: boolean;
}>();

const slotMap = useSlots();

/**
 * 判断操作插槽里是否有按钮。没有按钮时窄屏隐藏操作区，宽屏仍占一列。
 */
function actionSlotHasContent(): boolean {
  const actionSlot = slotMap.actions;
  if (actionSlot === undefined) {
    return false;
  }
  return actionSlot().some((node) => node.type !== Comment);
}
</script>

<style scoped>
.record-card {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
}

.record-card.is-selectable {
  cursor: pointer;
}

.record-card.is-selected {
  background: #e8f0fe;
  border-color: #2563eb;
}

.record-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px 24px;
}

.record-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e6e8ec;
}

.record-actions.is-empty {
  display: none;
}

@media (min-width: 769px) {
  .record-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) {
  .record-fields {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
