<template>
  <div class="record-field">
    <div class="record-field-label">{{ label }}</div>
    <div class="record-field-value">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<style scoped>
.record-field {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.record-field-label {
  flex-shrink: 0;
  width: 72px;
  font-size: 13px;
  line-height: 22px;
  color: #667085;
}

.record-field-value {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 22px;
  color: #1c2434;
  word-break: break-word;
}
</style>
