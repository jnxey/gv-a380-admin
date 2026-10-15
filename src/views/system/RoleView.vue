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
    <el-dialog v-model="dialogVisible" :title="editingRoleName" width="480px">
      <el-tree
        ref="assignTreeRef"
        class="assign-tree"
        :data="assignTree"
        node-key="nodeKey"
        show-checkbox
        check-strictly
        default-expand-all
        :props="assignTreeProps"
        @check="onAssignTreeCheck"
      />
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRole">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { AssignTreeNodeKey, AssignTreeNodeKind, MenuRoot, PermissionCode, statusLabel } from '../../utils/constants';
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

interface AssignTreeStoreNode {
  checked: boolean;
  level: number;
  data: AssignTreeNode;
  parent: AssignTreeStoreNode | null;
  childNodes: AssignTreeStoreNode[];
}

interface AssignTreeExpose {
  setCheckedKeys: (nodeKeyList: string[], leafOnly?: boolean) => void;
  getCheckedKeys: (leafOnly?: boolean) => string[];
  getNode: (nodeData: AssignTreeNode) => AssignTreeStoreNode | null;
}

const assignTreeProps = {
  label: 'label',
  children: 'children',
};

const router = useRouter();
const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.SYSTEM_ROLE_SAVE);
const roleList = ref<RoleRow[]>([]);
const dialogVisible = ref(false);
const editingRoleId = ref('');
const editingRoleName = ref('');
const permissionList = ref<PermissionOption[]>([]);
const menuList = ref<MenuOption[]>([]);
const assignTreeRef = ref<AssignTreeExpose>();
const syncingAssignTree = ref(false);

/**
 * 目录、页面和按钮权限组成的分配树。
 */
const assignTree = computed(() => {
  const rootMenuList = menuList.value.filter((menu) => menu.parentId === MenuRoot.PARENT_ID);
  return rootMenuList.map((menu) => toMenuTreeNode(menu));
});

/**
 * 查询全部角色。
 */
async function loadRoles(): Promise<void> {
  roleList.value = (await http.get('/admin/system/roles')) as RoleRow[];
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
 * 打开分配弹窗，并勾上当前角色已有的菜单和权限。
 */
async function openEdit(roleRow: RoleRow): Promise<void> {
  const roleDetail = (await http.get(`/admin/system/roles/${roleRow.roleId}`)) as RoleDetail;
  editingRoleId.value = roleDetail.roleId;
  editingRoleName.value = roleDetail.roleName;
  permissionList.value = roleDetail.permissionList;
  menuList.value = roleDetail.menuList;
  const checkedNodeKeyList = [
    ...roleDetail.menuIdList.map((menuId) => buildNodeKey(AssignTreeNodeKind.MENU, menuId)),
    ...roleDetail.permissionIdList.map((permissionId) => buildNodeKey(AssignTreeNodeKind.PERMISSION, permissionId)),
  ];
  dialogVisible.value = true;
  await nextTick();
  assignTreeRef.value?.setCheckedKeys(checkedNodeKeyList, false);
}

/**
 * 勾选只向上带父级。取消目录或页面时，取消它下面的节点。
 */
function onAssignTreeCheck(nodeData: AssignTreeNode): void {
  if (syncingAssignTree.value === true || isEmpty(assignTreeRef.value)) {
    return;
  }
  const currentNode = assignTreeRef.value.getNode(nodeData);
  if (isEmpty(currentNode)) {
    return;
  }
  // 1. 先记下当前已经勾上的节点，再按这次操作补父级或去掉下级
  const checkedNodeKeySet = new Set<string>();
  assignTreeRef.value.getCheckedKeys(false).forEach((nodeKey) => {
    const nodeKeyText = String(nodeKey);
    if (!isEmpty(nodeKeyText)) {
      checkedNodeKeySet.add(nodeKeyText);
    }
  });
  if (currentNode.checked === true) {
    collectAncestorMenuNodeKeys(currentNode, checkedNodeKeySet);
  } else {
    removeDescendantNodeKeys(currentNode, checkedNodeKeySet);
  }
  const checkedNodeKeyList = [...checkedNodeKeySet];
  // 2. 等这次勾选落定后整组写回。严格勾选模式下，回调里单独改父节点不会刷新
  syncingAssignTree.value = true;
  nextTick(() => {
    assignTreeRef.value?.setCheckedKeys(checkedNodeKeyList, false);
    syncingAssignTree.value = false;
  });
}

/**
 * 勾中权限或页面时，把它上面的菜单也放进勾选结果。
 */
function collectAncestorMenuNodeKeys(currentNode: AssignTreeStoreNode, checkedNodeKeySet: Set<string>): void {
  let parentNode = currentNode.parent;
  while (!isEmpty(parentNode) && parentNode.level > 0) {
    const parentNodeKey = parentNode.data.nodeKey;
    if (!isEmpty(parentNodeKey) && readNodeKind(parentNodeKey) === AssignTreeNodeKind.MENU) {
      checkedNodeKeySet.add(parentNodeKey);
    }
    parentNode = parentNode.parent;
  }
}

/**
 * 取消目录或页面时，从勾选结果里拿掉它下面的页面和权限。
 */
function removeDescendantNodeKeys(currentNode: AssignTreeStoreNode, checkedNodeKeySet: Set<string>): void {
  currentNode.childNodes.forEach((childNode) => {
    const childNodeKey = childNode.data.nodeKey;
    if (!isEmpty(childNodeKey)) {
      checkedNodeKeySet.delete(childNodeKey);
    }
    removeDescendantNodeKeys(childNode, checkedNodeKeySet);
  });
}

/**
 * 保存权限和菜单。改完重新拉取当前登录人的菜单。
 */
async function saveRole(): Promise<void> {
  if (isEmpty(editingRoleId.value) || isEmpty(assignTreeRef.value)) {
    return;
  }
  const checkedNodeKeyList = assignTreeRef.value.getCheckedKeys(false);
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
  dialogVisible.value = false;
  await loadRoles();
}

onMounted(() => {
  void loadRoles();
});
</script>

<style scoped>
.assign-tree {
  max-height: 480px;
  overflow: auto;
}
</style>
