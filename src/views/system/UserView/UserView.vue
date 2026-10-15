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
    <el-dialog v-model="dialogVisible" :title="editingUserId === '' ? '新建账号' : '编辑账号'" width="520px">
      <el-form label-position="top">
        <el-form-item label="登录名">
          <el-input v-model="userForm.username" :disabled="editingUserId !== ''" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="userForm.password"
            type="password"
            show-password
            :placeholder="editingUserId === '' ? '' : '留空则不修改'"
          />
        </el-form-item>
        <el-form-item label="姓名"><el-input v-model="userForm.realName" /></el-form-item>
        <el-form-item label="手机"><el-input v-model="userForm.mobile" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="userForm.status">
            <el-option label="启用" :value="RecordStatus.ENABLED" />
            <el-option label="停用" :value="RecordStatus.DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.roleId">
            <el-option v-for="role in roleList" :key="role.roleId" :label="role.roleName" :value="role.roleId" />
          </el-select>
        </el-form-item>
        <el-form-item label="门店">
          <el-select v-model="userForm.shopIdList" multiple>
            <el-option v-for="shop in shopList" :key="shop.shopId" :label="shop.shopName" :value="shop.shopId" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="large" @click="dialogVisible = false">取消</el-button>
        <el-button size="large" type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import RecordCard from '../../../components/RecordCard/RecordCard.vue';
import RecordField from '../../../components/RecordField/RecordField.vue';
import { PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface ShopOptionRow {
  shopId: string;
  shopCode: string;
  shopName: string;
  shopType: string;
}

interface RoleOptionRow {
  roleId: string;
  roleCode: string;
  roleName: string;
  roleScope: string;
}

interface UserRow {
  userId: string;
  username: string;
  realName: string;
  mobile: string;
  status: string;
  roleId: string;
  roleName: string;
  shopList: ShopOptionRow[];
}

const router = useRouter();
const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.SYSTEM_USER_SAVE);
const userList = ref<UserRow[]>([]);
const roleList = ref<RoleOptionRow[]>([]);
const shopList = ref<ShopOptionRow[]>([]);
const dialogVisible = ref(false);
const editingUserId = ref('');
const userForm = reactive({
  username: '',
  password: '',
  realName: '',
  mobile: '',
  status: RecordStatus.ENABLED as string,
  roleId: '',
  shopIdList: [] as string[],
});

/**
 * 查询全部后台账号。
 */
async function loadUsers(): Promise<void> {
  userList.value = (await http.get('/admin/system/users')) as UserRow[];
}

/**
 * 读取角色和门店选项。
 */
async function loadOptions(): Promise<void> {
  const optionResult = (await http.get('/admin/system/users/options')) as {
    roleList: RoleOptionRow[];
    shopList: ShopOptionRow[];
  };
  roleList.value = optionResult.roleList;
  shopList.value = optionResult.shopList;
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
async function openCreate(): Promise<void> {
  await loadOptions();
  editingUserId.value = '';
  userForm.username = '';
  userForm.password = '';
  userForm.realName = '';
  userForm.mobile = '';
  userForm.status = RecordStatus.ENABLED;
  userForm.roleId = '';
  userForm.shopIdList = [];
  dialogVisible.value = true;
}

/**
 * 打开编辑弹窗。登录名不可改，密码留空。
 */
async function openEdit(userRow: UserRow): Promise<void> {
  await loadOptions();
  editingUserId.value = userRow.userId;
  userForm.username = userRow.username;
  userForm.password = '';
  userForm.realName = userRow.realName;
  userForm.mobile = userRow.mobile;
  userForm.status = userRow.status;
  userForm.roleId = userRow.roleId;
  userForm.shopIdList = userRow.shopList.map((shop) => shop.shopId);
  dialogVisible.value = true;
}

/**
 * 保存账号。改到当前登录人时重新拉取菜单和门店。
 */
async function saveUser(): Promise<void> {
  if (isEmpty(userForm.username) || isEmpty(userForm.realName) || isEmpty(userForm.roleId) || isEmpty(userForm.shopIdList)) {
    ElMessage.warning('请填写登录名、姓名、角色和门店');
    return;
  }
  if (isEmpty(editingUserId.value) && isEmpty(userForm.password)) {
    ElMessage.warning('请填写密码');
    return;
  }
  if (isEmpty(editingUserId.value)) {
    await http.post('/admin/system/users', {
      username: userForm.username,
      password: userForm.password,
      realName: userForm.realName,
      mobile: userForm.mobile,
      status: userForm.status,
      roleId: userForm.roleId,
      shopIdList: userForm.shopIdList,
    });
  } else {
    await http.put(`/admin/system/users/${editingUserId.value}`, {
      realName: userForm.realName,
      mobile: userForm.mobile,
      status: userForm.status,
      roleId: userForm.roleId,
      shopIdList: userForm.shopIdList,
      password: userForm.password,
    });
  }
  if (userForm.username === sessionStore.username) {
    sessionStore.menuLoaded = false;
    await sessionStore.loadSession(router);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  await loadUsers();
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
