<template>
  <el-pagination
    class="pager"
    background
    layout="total, prev, pager, next"
    :total="total"
    :current-page="currentPage"
    :page-size="pageSize"
    @current-change="onCurrentChange"
  />
</template>

<script setup lang="ts">
/**
 * 列表底部分页。样式与 A380 查询页一致。
 */
defineProps<{
  total: number;
  currentPage: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  currentChange: [nextPage: number];
}>();

/**
 * 把页码交给外层重新查询。
 */
function onCurrentChange(nextPage: number): void {
  emit('currentChange', nextPage);
}
</script>

<style scoped>
.pager {
  margin-top: 16px;
}
</style>
