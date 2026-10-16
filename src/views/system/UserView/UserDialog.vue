<template>
  <el-dialog v-model="visible" :title="isEmpty(user) ? '新建账号' : '编辑账号'" width="520px">
    <el-form label-position="top">
      <el-form-item label="登录名">
        <el-input v-model="userForm.username" :disabled="isEmpty(user) !== true" />
      </el-form-item>
      <el-form-item label="密码">
        <el-input v-model="userForm.password" type="password" show-password :placeholder="isEmpty(user) ? '' : '留空则不修改'" />
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
      <el-button size="large" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" @click="saveUser">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { RecordStatus } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

export interface ShopOptionRow {
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

export interface UserRow {
  userId: string;
  username: string;
  realName: string;
  mobile: string;
  status: string;
  roleId: string;
  roleName: string;
  shopList: ShopOptionRow[];
}

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  user: UserRow | null;
}>();
const emit = defineEmits<{
  saved: [];
}>();

const router = useRouter();
const sessionStore = useSessionStore();
const roleList = ref<RoleOptionRow[]>([]);
const shopList = ref<ShopOptionRow[]>([]);
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
 * 打开时读取角色和门店，再按传入的账号填表。
 */
watch(visible, (opened) => {
  if (opened !== true) {
    return;
  }
  void openUserForm();
});

/**
 * 读取选项并填入当前账号。新建时清空。
 */
async function openUserForm(): Promise<void> {
  await loadOptions();
  fillUserForm(props.user);
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
 * 把账号写进表单。编辑时密码留空，登录名不可改。
 */
function fillUserForm(userRow: UserRow | null): void {
  if (isEmpty(userRow)) {
    userForm.username = '';
    userForm.password = '';
    userForm.realName = '';
    userForm.mobile = '';
    userForm.status = RecordStatus.ENABLED;
    userForm.roleId = '';
    userForm.shopIdList = [];
    return;
  }
  userForm.username = userRow.username;
  userForm.password = '';
  userForm.realName = userRow.realName;
  userForm.mobile = userRow.mobile;
  userForm.status = userRow.status;
  userForm.roleId = userRow.roleId;
  userForm.shopIdList = userRow.shopList.map((shop) => shop.shopId);
}

/**
 * 保存账号。改到当前登录人时重新拉取菜单和门店。
 */
async function saveUser(): Promise<void> {
  if (isEmpty(userForm.username) || isEmpty(userForm.realName) || isEmpty(userForm.roleId) || isEmpty(userForm.shopIdList)) {
    ElMessage.warning('请填写登录名、姓名、角色和门店');
    return;
  }
  if (isEmpty(props.user) && isEmpty(userForm.password)) {
    ElMessage.warning('请填写密码');
    return;
  }
  if (isEmpty(props.user)) {
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
    await http.put(`/admin/system/users/${props.user.userId}`, {
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
  visible.value = false;
  emit('saved');
}
</script>
