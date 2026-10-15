<template>
  <el-card>
    <div class="home-brand">
      <img class="home-logo" src="/favicon.svg" alt="" />
      <div class="home-name">A380 管理后台</div>
    </div>
    <div v-if="isEmpty(entryGroupList)" class="home-empty">暂无可用入口</div>
    <section v-for="entryGroup in entryGroupList" :key="entryGroup.menuId" class="home-group">
      <h2 class="home-group-name">{{ entryGroup.menuName }}</h2>
      <div class="home-entries">
        <button
          v-for="entry in entryGroup.entryList"
          :key="entry.menuId"
          type="button"
          class="home-entry"
          @click="openEntry(entry.menuPath)"
        >
          <MenuIcon :icon-name="resolveMenuIconName(entry.menuPath)" />
          <span>{{ entry.menuName }}</span>
        </button>
      </div>
    </section>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import MenuIcon from '../../layout/MenuIcon.vue';
import { viewComponentMap } from '../../router/view-map';
import { useSessionStore } from '../../stores/session';
import { menuIconNameByPath } from '../../utils/constants';
import { isEmpty } from '../../utils/tools';

interface HomeEntry {
  menuId: string;
  menuName: string;
  menuPath: string;
}

interface HomeEntryGroup {
  menuId: string;
  menuName: string;
  entryList: HomeEntry[];
}

const router = useRouter();
const sessionStore = useSessionStore();

/**
 * 按菜单分组整理当前账号能打开的页面入口。
 */
const entryGroupList = computed(() => {
  const groupList: HomeEntryGroup[] = [];
  sessionStore.menuTree.forEach((menuNode) => {
    const entryList = menuNode.children
      .filter((childMenu) => {
        return !isEmpty(childMenu.menuPath) && viewComponentMap[childMenu.componentPath] !== undefined;
      })
      .map((childMenu) => {
        return {
          menuId: childMenu.menuId,
          menuName: childMenu.menuName,
          menuPath: childMenu.menuPath,
        };
      });
    if (isEmpty(entryList)) {
      return;
    }
    groupList.push({
      menuId: menuNode.menuId,
      menuName: menuNode.menuName,
      entryList,
    });
  });
  return groupList;
});

/**
 * 按菜单路径取图标名。没有对应图标时返回空字符串。
 */
function resolveMenuIconName(menuPath: string): string {
  const iconName = menuIconNameByPath[menuPath];
  if (isEmpty(iconName)) {
    return '';
  }
  return iconName;
}

/**
 * 打开选中的页面入口。
 */
function openEntry(menuPath: string): void {
  void router.push(menuPath);
}
</script>

<style scoped>
.home-brand {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.home-logo {
  width: 48px;
  height: 48px;
}

.home-name {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.3;
  color: #1c2434;
}

.home-empty {
  color: #667085;
}

.home-group + .home-group {
  margin-top: 20px;
}

.home-group-name {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #667085;
}

.home-entries {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.home-entry {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #ffffff;
  color: #1c2434;
  font-size: 14px;
  line-height: 22px;
  text-align: left;
  cursor: pointer;
}

.home-entry:hover {
  background: #f5f7fa;
}

@media (min-width: 769px) {
  .home-entries {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}
</style>
