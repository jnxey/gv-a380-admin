<template>
  <el-card>
    <el-table :data="roleList" border>
      <el-table-column prop="roleName" label="角色" />
      <el-table-column prop="roleCode" label="编码" />
      <el-table-column label="范围">
        <template #default="scope">{{ statusLabel(scope.row.roleScope) }}</template>
      </el-table-column>
      <el-table-column v-if="canSave" label="操作">
        <template #default="scope">
          <el-button link type="primary" @click="openEdit(scope.row)">分配权限</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="dialogVisible" :title="editingRoleName" width="640px">
      <div class="assign-title">权限</div>
      <el-checkbox-group v-model="permissionIdList" class="assign-group">
        <el-checkbox v-for="permission in permissionList" :key="permission.permissionId" :value="permission.permissionId">
          {{ permission.permissionName }}
        </el-checkbox>
      </el-checkbox-group>
      <div class="assign-title">菜单</div>
      <el-checkbox-group v-model="menuIdList" class="assign-group">
        <div v-for="menu in rootMenuList" :key="menu.menuId" class="menu-block">
          <el-checkbox :value="menu.menuId">{{ menu.menuName }}</el-checkbox>
          <div v-for="childMenu in childMenuList(menu.menuId)" :key="childMenu.menuId" class="menu-child">
            <el-checkbox :value="childMenu.menuId">{{ childMenu.menuName }}</el-checkbox>
          </div>
        </div>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRole">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { MenuRoot, PermissionCode, statusLabel } from '../../utils/constants';
import { isEmpty } from '../../utils/tools';
import { useSessionStore } from '../../stores/session';
import http from '../../utils/request';

interface RoleRow {
  roleId: string;
  roleCode: string;
  roleName: string;
  roleScope: string;
}

interface PermissionOption {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  moduleCode: string;
}

interface MenuOption {
  menuId: string;
  parentId: string;
  menuName: string;
  menuPath: string;
}

interface RoleDetail extends RoleRow {
  permissionIdList: string[];
  menuIdList: string[];
  permissionList: PermissionOption[];
  menuList: MenuOption[];
}

const router = useRouter();
const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.SYSTEM_ROLE_SAVE);
const roleList = ref<RoleRow[]>([]);
const dialogVisible = ref(false);
const editingRoleId = ref('');
const editingRoleName = ref('');
const permissionList = ref<PermissionOption[]>([]);
const menuList = ref<MenuOption[]>([]);
const permissionIdList = ref<string[]>([]);
const menuIdList = ref<string[]>([]);

/**
 * 顶级菜单。子菜单挂在各自的父级下面。
 */
const rootMenuList = computed(() => {
  return menuList.value.filter((menu) => menu.parentId === MenuRoot.PARENT_ID);
});

/**
 * 查询全部角色。
 */
async function loadRoles(): Promise<void> {
  roleList.value = (await http.get('/admin/system/roles')) as RoleRow[];
}

/**
 * 某个父菜单下的子菜单。
 */
function childMenuList(parentId: string): MenuOption[] {
  return menuList.value.filter((menu) => menu.parentId === parentId);
}

/**
 * 打开分配弹窗，带上当前勾选和全部可选项。
 */
async function openEdit(roleRow: RoleRow): Promise<void> {
  const roleDetail = (await http.get(`/admin/system/roles/${roleRow.roleId}`)) as RoleDetail;
  editingRoleId.value = roleDetail.roleId;
  editingRoleName.value = roleDetail.roleName;
  permissionList.value = roleDetail.permissionList;
  menuList.value = roleDetail.menuList;
  permissionIdList.value = roleDetail.permissionIdList;
  menuIdList.value = roleDetail.menuIdList;
  dialogVisible.value = true;
}

/**
 * 保存权限和菜单。改完重新拉取当前登录人的菜单。
 */
async function saveRole(): Promise<void> {
  if (isEmpty(editingRoleId.value)) {
    return;
  }
  await http.put(`/admin/system/roles/${editingRoleId.value}`, {
    permissionIdList: permissionIdList.value,
    menuIdList: menuIdList.value,
  });
  sessionStore.menuLoaded = false;
  await sessionStore.loadSession(router);
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  await loadRoles();
}

onMounted(() => {
  void loadRoles();
});
</script>

<style scoped>
.assign-title {
  margin: 8px 0;
  font-weight: 600;
}

.assign-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.menu-block {
  width: 100%;
}

.menu-child {
  margin-left: 24px;
}
</style>
