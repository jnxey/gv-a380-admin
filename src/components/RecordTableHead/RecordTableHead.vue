<template>
  <div v-show="isEmpty(headCellList) === false" ref="headRef" class="record-head" :class="{ 'is-ready': isEmpty(headCellList) === false }">
    <div v-for="(headCell, headCellIndex) in headCellList" :key="headCellIndex" class="record-head-cell">
      {{ headCell }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { isEmpty } from '../../utils/tools';

const actionHeadLabel = '操作';
const headCellList = ref<string[]>([]);
const headRef = ref<HTMLElement | null>(null);
let listObserver: MutationObserver | null = null;

/**
 * 从第一张卡片读取列名。没有卡片时不显示表头。
 */
function readHeadCellList(): void {
  const headElement = headRef.value;
  if (isEmpty(headElement) || isEmpty(headElement.parentElement)) {
    return;
  }
  const firstCard = headElement.parentElement.querySelector('.record-card');
  if (isEmpty(firstCard)) {
    if (isEmpty(headCellList.value) !== true) {
      headCellList.value = [];
    }
    return;
  }
  const nextCellList: string[] = [];
  firstCard.querySelectorAll('.record-field-label').forEach((labelNode) => {
    const labelText = labelNode.textContent;
    if (isEmpty(labelText)) {
      return;
    }
    nextCellList.push(labelText.trim());
  });
  const actionNode = firstCard.querySelector('.record-actions');
  if (isEmpty(actionNode) !== true && actionNode.classList.contains('is-empty') !== true) {
    nextCellList.push(actionHeadLabel);
  }
  if (nextCellList.join('\n') === headCellList.value.join('\n')) {
    return;
  }
  headCellList.value = nextCellList;
}

/**
 * 列表卡片晚于表头出现，卡片增删后再读一次列名。
 */
function watchRoomList(): void {
  const headElement = headRef.value;
  if (isEmpty(headElement) || isEmpty(headElement.parentElement)) {
    return;
  }
  readHeadCellList();
  listObserver = new MutationObserver(() => {
    void nextTick().then(() => {
      readHeadCellList();
    });
  });
  listObserver.observe(headElement.parentElement, { childList: true, subtree: true });
}

onMounted(() => {
  watchRoomList();
});

onBeforeUnmount(() => {
  if (listObserver !== null) {
    listObserver.disconnect();
    listObserver = null;
  }
});
</script>
