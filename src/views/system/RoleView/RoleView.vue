<template>
  <el-card>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(roleList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="roleRow in roleList" :key="roleRow.roleId">
        <RecordField label="角色">{{ roleRow.roleName }}</RecordField>
        <RecordField label="编码">{{ roleRow.roleCode }}</RecordField>
        <RecordField label="范围">{{ statusLabel(roleRow.roleScope) }}</RecordField>
        <template v-if="canSave" #actions>
          <el-button link type="primary" @click="openEdit(roleRow)">分配权限</el-button>
        </template>
      </RecordCard>
    </div>
    <RoleDialog v-model="dialogVisible" :role="editingRole" @saved="loadRoles" />
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { PermissionCode, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';
import RoleDialog, { type RoleRow } from './RoleDialog.vue';

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.SYSTEM_ROLE_SAVE);
const roleList = ref<RoleRow[]>([]);
const dialogVisible = ref(false);
const editingRole = ref<RoleRow | null>(null);

/**
 * 查询全部角色。
 */
async function loadRoles(): Promise<void> {
  roleList.value = (await http.get('/a380/system/roles')) as RoleRow[];
}

/**
 * 打开分配权限弹窗。
 */
function openEdit(roleRow: RoleRow): void {
  editingRole.value = roleRow;
  dialogVisible.value = true;
}

onMounted(() => {
  void loadRoles();
});
</script>
