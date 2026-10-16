<template>
  <el-dialog v-model="visible" :title="isEmpty(role) ? '' : role.roleName" width="480px">
    <el-tree
      ref="assignTreeRef"
      class="assign-tree"
      :data="assignTree"
      node-key="nodeKey"
      show-checkbox
      default-expand-all
      :props="assignTreeProps"
    />
    <template #footer>
      <el-button size="large" @click="visible = false">取消</el-button>
      <el-button size="large" type="primary" @click="saveRole">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { AssignTreeNodeKey, AssignTreeNodeKind, MenuRoot } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

export interface RoleRow {
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
  menuId: string;
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

interface AssignTreeNode {
  nodeKey: string;
  label: string;
  children: AssignTreeNode[];
}

interface AssignTreeExpose {
  setCheckedKeys: (nodeKeyList: string[], leafOnly?: boolean) => void;
  getCheckedKeys: (leafOnly?: boolean) => string[];
  getHalfCheckedKeys: () => string[];
}

const assignTreeProps = {
  label: 'label',
  children: 'children',
};

const visible = defineModel<boolean>({ required: true });
const props = defineProps<{
  role: RoleRow | null;
}>();
const emit = defineEmits<{
  saved: [];
}>();

const router = useRouter();
const sessionStore = useSessionStore();
const editingRoleId = ref('');
const permissionList = ref<PermissionOption[]>([]);
const menuList = ref<MenuOption[]>([]);
const assignTreeRef = ref<AssignTreeExpose>();

/**
 * 目录、页面和按钮权限组成的分配树。
 */
const assignTree = computed(() => {
  const rootMenuList = menuList.value.filter((menu) => menu.parentId === MenuRoot.PARENT_ID);
  return rootMenuList.map((menu) => toMenuTreeNode(menu));
});

/**
 * 打开时拉取角色详情，并只勾上已保存的叶子节点。
 */
watch(visible, (opened) => {
  if (opened !== true) {
    return;
  }
  void openRoleForm();
});

/**
 * 读取角色已有菜单和权限，回显时去掉半选父级。
 */
async function openRoleForm(): Promise<void> {
  if (isEmpty(props.role)) {
    return;
  }
  const roleDetail = (await http.get(`/admin/system/roles/${props.role.roleId}`)) as RoleDetail;
  editingRoleId.value = roleDetail.roleId;
  permissionList.value = roleDetail.permissionList;
  menuList.value = roleDetail.menuList;
  // 1. 接口里的菜单含全选和半选父级，回显时去掉，避免把没保存的子级勾上
  const checkedNodeKeyList = [
    ...roleDetail.menuIdList.map((menuId) => buildNodeKey(AssignTreeNodeKind.MENU, menuId)),
    ...roleDetail.permissionIdList.map((permissionId) => buildNodeKey(AssignTreeNodeKind.PERMISSION, permissionId)),
  ];
  const leafNodeKeyList = keepLeafNodeKeyList(checkedNodeKeyList);
  await nextTick();
  assignTreeRef.value?.setCheckedKeys(leafNodeKeyList, false);
}

/**
 * 把一个菜单和它下面的页面、权限收成树节点。
 */
function toMenuTreeNode(menu: MenuOption): AssignTreeNode {
  const childMenuNodeList = menuList.value
    .filter((childMenu) => childMenu.parentId === menu.menuId)
    .map((childMenu) => toMenuTreeNode(childMenu));
  const permissionNodeList = permissionList.value
    .filter((permission) => permission.menuId === menu.menuId)
    .map((permission) => ({
      nodeKey: buildNodeKey(AssignTreeNodeKind.PERMISSION, permission.permissionId),
      label: permission.permissionName,
      children: [],
    }));
  return {
    nodeKey: buildNodeKey(AssignTreeNodeKind.MENU, menu.menuId),
    label: menu.menuName,
    children: [...childMenuNodeList, ...permissionNodeList],
  };
}

/**
 * 拼出树上的节点主键。
 */
function buildNodeKey(nodeKind: string, nodeId: string): string {
  return `${nodeKind}${AssignTreeNodeKey.SEPARATOR}${nodeId}`;
}

/**
 * 读出节点种类。
 */
function readNodeKind(nodeKey: string): string {
  const separatorIndex = nodeKey.indexOf(AssignTreeNodeKey.SEPARATOR);
  if (separatorIndex < 0) {
    return '';
  }
  return nodeKey.slice(0, separatorIndex);
}

/**
 * 读出节点上的菜单或权限主键。
 */
function readNodeId(nodeKey: string): string {
  const separatorIndex = nodeKey.indexOf(AssignTreeNodeKey.SEPARATOR);
  if (separatorIndex < 0) {
    return '';
  }
  return nodeKey.slice(separatorIndex + AssignTreeNodeKey.SEPARATOR.length);
}

/**
 * 收集没有子节点的键。回显时只勾这些，父级全选和半选由树自己算。
 */
function collectLeafNodeKeySet(nodeList: AssignTreeNode[], leafNodeKeySet: Set<string>): void {
  nodeList.forEach((node) => {
    if (isEmpty(node.children)) {
      leafNodeKeySet.add(node.nodeKey);
      return;
    }
    collectLeafNodeKeySet(node.children, leafNodeKeySet);
  });
}

/**
 * 从已保存的菜单和权限里只留下叶子节点。
 */
function keepLeafNodeKeyList(checkedNodeKeyList: string[]): string[] {
  const leafNodeKeySet = new Set<string>();
  collectLeafNodeKeySet(assignTree.value, leafNodeKeySet);
  return checkedNodeKeyList.filter((nodeKey) => leafNodeKeySet.has(nodeKey));
}

/**
 * 保存权限和菜单。全选和半选一起提交，改完重新拉取当前登录人的菜单。
 */
async function saveRole(): Promise<void> {
  if (isEmpty(editingRoleId.value) || isEmpty(assignTreeRef.value)) {
    return;
  }
  // 全选和半选都要提交。半选父级是菜单，只提交叶子的话页面和目录会丢
  const checkedNodeKeyList = [...assignTreeRef.value.getCheckedKeys(false), ...assignTreeRef.value.getHalfCheckedKeys()];
  const menuIdList: string[] = [];
  const permissionIdList: string[] = [];
  checkedNodeKeyList.forEach((nodeKey) => {
    const nodeId = readNodeId(String(nodeKey));
    if (isEmpty(nodeId)) {
      return;
    }
    if (readNodeKind(String(nodeKey)) === AssignTreeNodeKind.MENU) {
      menuIdList.push(nodeId);
    }
    if (readNodeKind(String(nodeKey)) === AssignTreeNodeKind.PERMISSION) {
      permissionIdList.push(nodeId);
    }
  });
  await http.put(`/admin/system/roles/${editingRoleId.value}`, {
    permissionIdList,
    menuIdList,
  });
  sessionStore.menuLoaded = false;
  await sessionStore.loadSession(router);
  ElMessage.success('保存成功');
  visible.value = false;
  emit('saved');
}
</script>

<style scoped>
.assign-tree {
  max-height: 480px;
  overflow: auto;
}
</style>
