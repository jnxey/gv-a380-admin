<template>
  <div class="login-page">
    <div class="login-backdrop" aria-hidden="true">
      <span class="orb orb-amber"></span>
      <span class="orb orb-blue"></span>
      <span class="grid"></span>
    </div>

    <div class="login-layout">
      <section class="login-intro">
        <p class="login-kicker">管理后台</p>
        <h1>A380</h1>
        <p class="login-lead">KTV、酒店、会员和财务</p>
        <ul class="login-modules">
          <li>KTV</li>
          <li>酒店</li>
          <li>会员</li>
          <li>财务</li>
        </ul>
      </section>

      <div class="login-card-shell">
        <div class="login-card-glow" aria-hidden="true"></div>
        <el-card class="login-card" shadow="never">
          <p class="login-card-kicker">账号登录</p>
          <h2>欢迎回来</h2>
          <el-form label-position="top" :model="loginForm" @submit.prevent="onSubmit">
            <el-form-item label="账号">
              <el-input
                v-model="loginForm.username"
                placeholder="请输入账号"
                autocomplete="username"
                size="large"
              >
                <template #prefix>
                  <AppIcon class="field-icon" :icon-name="MenuIconName.LOGIN_ACCOUNT" />
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="密码">
              <el-input
                v-model="loginForm.password"
                type="password"
                show-password
                placeholder="请输入密码"
                autocomplete="current-password"
                size="large"
              >
                <template #prefix>
                  <AppIcon class="field-icon" :icon-name="MenuIconName.LOGIN_PASSWORD" />
                </template>
              </el-input>
            </el-form-item>
            <el-button class="login-submit" type="primary" native-type="submit" size="large" :loading="submitting">
              登录
            </el-button>
          </el-form>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from '../../../components/AppIcon/AppIcon.vue';
import { useSessionStore } from '../../../stores/session';
import { MenuIconName } from '../../../utils/constants';
import http from '../../../utils/request';

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
    await router.replace('/');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.login-page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 32px 24px;
  box-sizing: border-box;
  color: #f4f1ea;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(232, 195, 122, 0.16), transparent 55%),
    radial-gradient(900px 500px at 110% 110%, rgba(90, 168, 255, 0.18), transparent 50%),
    #070b16;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.login-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(8px);
}

.orb-amber {
  width: 280px;
  height: 280px;
  left: 8%;
  top: 18%;
  background: rgba(232, 195, 122, 0.22);
  animation: drift 14s ease-in-out infinite;
}

.orb-blue {
  width: 340px;
  height: 340px;
  right: 6%;
  bottom: 8%;
  background: rgba(80, 150, 255, 0.2);
  animation: drift 18s ease-in-out infinite reverse;
}

.grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(circle at center, black, transparent 75%);
}

.login-layout {
  position: relative;
  z-index: 1;
  width: min(1040px, 100%);
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 420px);
  gap: 72px;
  align-items: center;
}

.login-kicker,
.login-card-kicker {
  margin: 0 0 12px;
  letter-spacing: 0.28em;
  font-size: 12px;
  color: #e8c37a;
}

.login-intro h1 {
  margin: 0;
  font-size: 52px;
  line-height: 1.15;
  letter-spacing: 0.04em;
  font-weight: 600;
  color: #f7f4ee;
}

.login-lead {
  margin: 18px 0 0;
  max-width: 420px;
  font-size: 16px;
  line-height: 1.7;
  color: #b7c0d4;
}

.login-modules {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

.login-modules li {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(232, 195, 122, 0.35);
  background: rgba(232, 195, 122, 0.08);
  color: #f0e2c2;
  font-size: 13px;
}

.login-card-shell {
  position: relative;
  border-radius: 22px;
  padding: 1px;
  overflow: hidden;
}

.login-card-glow {
  position: absolute;
  inset: -60%;
  background: conic-gradient(from 120deg, transparent 0 68%, rgba(232, 195, 122, 0.95) 78%, rgba(126, 196, 255, 0.9) 86%, transparent 96%);
  animation: spin 9s linear infinite;
}

.login-card {
  position: relative;
  border: none;
  border-radius: 21px;
  background: rgba(10, 16, 32, 0.92);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  --el-card-bg-color: transparent;
  --el-text-color-regular: #d5dced;
  --el-text-color-placeholder: #8d97ab;
  --el-fill-color-blank: rgba(255, 255, 255, 0.04);
  --el-border-color: rgba(255, 255, 255, 0.12);
  --el-border-color-hover: rgba(232, 195, 122, 0.7);
  --el-color-primary: #e0b15a;
}

.login-card :deep(.el-card__body) {
  padding: 36px 32px 32px;
}

.login-card h2 {
  margin: 0 0 24px;
  font-size: 28px;
  font-weight: 600;
  color: #f7f4ee;
}

.login-card :deep(.el-form-item__label) {
  color: #c9d2e4;
  font-size: 13px;
}

.login-card :deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
  background: rgba(255, 255, 255, 0.04);
}

.login-card :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #e8c37a inset, 0 0 0 4px rgba(232, 195, 122, 0.15);
}

.login-card :deep(.el-input__inner) {
  color: #f4f7fb;
}

.login-card :deep(.el-input__prefix .field-icon) {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: #e8c37a;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.login-submit {
  width: 100%;
  margin-top: 8px;
  height: 46px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  letter-spacing: 0.2em;
  color: #1a1408;
  background: linear-gradient(100deg, #f0d7a2 0%, #e0b15a 45%, #c98a3a 100%);
}

.login-submit:hover,
.login-submit:focus {
  color: #1a1408;
  background: linear-gradient(100deg, #f7e4bb 0%, #e8c37a 45%, #d49945 100%);
}

@keyframes drift {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(24px, -18px, 0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 860px) {
  .login-page {
    align-items: flex-start;
    padding: 28px 16px 32px;
  }

  .login-layout {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .login-intro h1 {
    font-size: 34px;
  }

  .login-lead {
    max-width: none;
  }

  .login-card :deep(.el-card__body) {
    padding: 28px 20px 24px;
  }
}

@media (max-width: 420px) {
  .login-page {
    padding: 20px 12px 24px;
  }

  .login-intro h1 {
    font-size: 26px;
    letter-spacing: 0;
  }

  .login-card :deep(.el-card__body) {
    padding: 22px 14px 18px;
  }
}
</style>
