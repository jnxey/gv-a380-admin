<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2>A380 管理后台</h2>
      <el-form :model="loginForm" @submit.prevent="onSubmit">
        <el-form-item label="账号">
          <el-input v-model="loginForm.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="loginForm.password" type="password" show-password />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="submitting" style="width: 100%">登录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../../stores/session';
import http from '../../utils/request';

const router = useRouter();
const sessionStore = useSessionStore();
const submitting = ref(false);
const loginForm = reactive({
  username: '',
  password: '',
});

/**
 * 提交后台账号登录。这里不处理会员登录。
 */
async function onSubmit(): Promise<void> {
  submitting.value = true;
  try {
    const loginResult = (await http.post('/admin/auth/login', loginForm)) as { accessToken: string };
    sessionStore.saveAccessToken(loginResult.accessToken);
    await router.push('/');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
}
.login-card {
  width: 380px;
}
</style>
