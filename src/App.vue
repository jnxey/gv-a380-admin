<template>
  <router-view />
</template>

<script setup lang="ts"></script>

<style>
body {
  margin: 0;
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
}

.pager {
  display: flex;
  justify-content: flex-end;
}

.el-dialog .el-select,
.el-dialog .el-date-editor {
  width: 100%;
}

.el-table .el-button.is-link {
  vertical-align: middle;
}
</style>
