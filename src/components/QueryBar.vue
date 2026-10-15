<template>
  <el-form class="query-bar" inline @submit.prevent="emit('search')">
    <slot />
    <el-form-item class="query-actions">
      <el-button type="primary" @click="emit('search')">查询</el-button>
      <el-button @click="emit('reset')">重置</el-button>
    </el-form-item>
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
  padding: 16px 16px 0;
  background: #f5f7fa;
  border-radius: 8px;
}

.query-bar :deep(.el-form-item) {
  margin-right: 12px;
  max-width: 100%;
}

.query-bar :deep(.query-keyword) {
  width: 180px;
  max-width: 100%;
}

.query-actions :deep(.el-form-item__content) {
  flex-wrap: nowrap;
}
</style>
