<template>
  <el-card>
    <div class="account-row">
      <span class="account-label">登录账号</span>
      <span>{{ sessionStore.username }}</span>
    </div>
    <div class="account-row">
      <span class="account-label">姓名</span>
      <span>{{ sessionStore.realName }}</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { useSessionStore } from '../../stores/session';

const sessionStore = useSessionStore();
</script>

<style scoped>
.account-row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 36px;
  color: #1c2434;
}

.account-label {
  width: 88px;
  flex-shrink: 0;
  color: #667085;
}
</style>
