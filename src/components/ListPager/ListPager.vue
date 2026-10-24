<template>
  <el-pagination
    class="pager"
    background
    :layout="pagerLayout"
    :total="total"
    :current-page="currentPage"
    :page-size="pageSize"
    :page-sizes="pageSizes"
    @current-change="onCurrentChange"
    @size-change="onSizeChange"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { isEmpty } from '../../utils/tools';

/**
 * 列表底部分页。样式与 A380 查询页一致。传入 pageSizes 时显示每页条数。
 */
const props = defineProps<{
  total: number;
  currentPage: number;
  pageSize: number;
  pageSizes?: number[];
}>();

const emit = defineEmits<{
  currentChange: [nextPage: number];
  sizeChange: [nextPageSize: number];
}>();

/**
 * 有条数选项时带上 sizes，否则保持原来的布局。
 */
const pagerLayout = computed(() => {
  if (isEmpty(props.pageSizes)) {
    return 'total, prev, pager, next';
  }
  return 'total, sizes, prev, pager, next';
});

/**
 * 把页码交给外层重新查询。
 */
function onCurrentChange(nextPage: number): void {
  emit('currentChange', nextPage);
}

/**
 * 把每页条数交给外层重新查询。
 */
function onSizeChange(nextPageSize: number): void {
  emit('sizeChange', nextPageSize);
}
</script>

<style scoped>
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
