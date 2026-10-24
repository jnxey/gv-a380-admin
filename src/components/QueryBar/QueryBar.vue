<template>
  <el-form class="query-bar" inline @submit.prevent="emit('search')">
    <slot />
    <el-form-item class="query-actions">
      <el-button type="primary" @click="emit('search')">查询</el-button>
      <el-button @click="emit('reset')">重置</el-button>
    </el-form-item>
    <slot name="append" />
  </el-form>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  search: [];
  reset: [];
}>();
</script>

<style scoped>
.query-bar {
  margin-bottom: 16px;
  padding: 12px 12px 0;
  background: #f5f7fa;
  border-radius: 8px;
}

.query-bar :deep(.el-form-item) {
  margin-right: 8px;
  margin-bottom: 12px;
  max-width: 100%;
}

.query-bar :deep(.query-keyword) {
  width: 180px;
  max-width: 100%;
}

.query-actions :deep(.el-form-item__content) {
  flex-wrap: nowrap;
}

.query-bar :deep(.el-date-editor){
  --el-date-editor-daterange-width: 260px;
}

@media (max-width: 768px) {
  .query-bar {
    padding: 0;
    background: transparent;
    border-radius: 0;
    border-bottom: 1px solid #e6e8ec;
  }

  .query-bar :deep(.query-keyword) {
    width: 150px;
    font-size: 12px;
  }

  .query-bar :deep(.el-input__clear),
  .query-bar :deep(.el-select__clear) {
    display: none;
  }
}
</style>
