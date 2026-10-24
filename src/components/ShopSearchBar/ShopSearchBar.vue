<template>
  <div class="shop-toolbar">
    <el-input
      :model-value="modelValue"
      class="shop-search"
      clearable
      placeholder="搜索名称/编码/电话/地址"
      @update:model-value="onKeywordChange"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 门店列表顶部的关键字搜索框。
 */
defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [keyword: string];
}>();

/**
 * 把输入内容交给外层。
 */
function onKeywordChange(keyword: string): void {
  emit('update:modelValue', keyword);
}
</script>

<style scoped>
.shop-toolbar {
  margin-bottom: 12px;
}

.shop-search {
  width: 280px;
  max-width: 100%;
}
</style>
