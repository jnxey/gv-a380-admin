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
    <el-button class="account-password-button" type="primary" @click="openPasswordDialog">修改密码</el-button>

    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="420px">
      <el-form label-position="top">
        <el-form-item label="旧密码">
          <el-input v-model="oldPassword" type="password" show-password placeholder="请输入旧密码" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="passwordDialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" :loading="passwordSaving" @click="submitPassword">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useSessionStore } from '../../../stores/session';
import { isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

const sessionStore = useSessionStore();
const passwordDialogVisible = ref(false);
const passwordSaving = ref(false);
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

/**
 * 打开修改密码弹窗，并清空上一次输入。
 */
function openPasswordDialog(): void {
  oldPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  passwordDialogVisible.value = true;
}

/**
 * 按旧密码修改当前账号密码。两次新密码必须一致。
 */
async function submitPassword(): Promise<void> {
  if (isEmpty(oldPassword.value)) {
    ElMessage.warning('请填写旧密码');
    return;
  }
  if (isEmpty(newPassword.value)) {
    ElMessage.warning('请填写新密码');
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    ElMessage.warning('两次输入的密码不一致');
    return;
  }
  passwordSaving.value = true;
  try {
    await http.post('/admin/auth/password', {
      oldPassword: oldPassword.value,
      newPassword: newPassword.value,
    });
    ElMessage.success('密码已修改');
    passwordDialogVisible.value = false;
  } finally {
    passwordSaving.value = false;
  }
}
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

.account-password-button {
  margin-top: 16px;
}
</style>
