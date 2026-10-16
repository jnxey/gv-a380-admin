<template>
  <el-card>
    <el-button v-if="canSave" type="primary" @click="openCreate">新建账号</el-button>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(userList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="userRow in userList" :key="userRow.userId">
        <RecordField label="登录名">{{ userRow.username }}</RecordField>
        <RecordField label="姓名">{{ userRow.realName }}</RecordField>
        <RecordField label="手机">{{ userRow.mobile }}</RecordField>
        <RecordField label="状态">
          <el-tag :type="userRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(userRow.status) }}
          </el-tag>
        </RecordField>
        <RecordField label="角色">{{ userRow.roleName }}</RecordField>
        <RecordField label="门店">{{ shopNameText(userRow) }}</RecordField>
        <template v-if="canSave" #actions>
          <el-button link type="primary" @click="openEdit(userRow)">编辑</el-button>
        </template>
      </RecordCard>
    </div>
    <UserDialog v-model="dialogVisible" :user="editingUser" @saved="loadUsers" />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import UserDialog, { type UserRow } from './UserDialog.vue';

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.SYSTEM_USER_SAVE);
const userList = ref<UserRow[]>([]);
const dialogVisible = ref(false);
const editingUser = ref<UserRow | null>(null);

/**
 * 查询全部后台账号。
 */
async function loadUsers(): Promise<void> {
  userList.value = (await http.get('/admin/system/users')) as UserRow[];
}

/**
 * 把门店名称拼成一列。
 */
function shopNameText(userRow: UserRow): string {
  if (isEmpty(userRow.shopList)) {
    return '';
  }
  return userRow.shopList.map((shop) => shop.shopName).join('、');
}

/**
 * 打开新建弹窗。
 */
function openCreate(): void {
  editingUser.value = null;
  dialogVisible.value = true;
}

/**
 * 打开编辑弹窗。
 */
function openEdit(userRow: UserRow): void {
  editingUser.value = userRow;
  dialogVisible.value = true;
}

onMounted(() => {
  void loadUsers();
});
</script>

<style scoped>
.record-list {
  margin-top: 16px;
}
</style>
