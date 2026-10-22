<template>
  <ShopSwitcher />
  <el-card>
    <div v-if="canSave" class="category-toolbar">
      <el-button type="primary" @click="openCreate">新建分类</el-button>
    </div>
    <div v-if="isEmpty(categoryList)" class="record-empty">暂无数据</div>
    <div v-else ref="sortListRef" class="category-list">
      <article v-for="categoryRow in categoryList" :key="categoryRow.categoryId" class="category-card">
        <div class="category-body">
          <div class="category-name name-box" :data-key="categoryRow.categoryId">
            <button v-if="canSave" type="button" class="drag-icon">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  fill="currentColor"
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M5.33333 5.33335C6.06971 5.33335 6.66667 4.7364 6.66667 4.00002C6.66667 3.26364 6.06971 2.66669 5.33333 2.66669C4.59695 2.66669 4 3.26364 4 4.00002C4 4.7364 4.59695 5.33335 5.33333 5.33335ZM10.6667 5.33335C11.403 5.33335 12 4.7364 12 4.00002C12 3.26364 11.403 2.66669 10.6667 2.66669C9.93029 2.66669 9.33333 3.26364 9.33333 4.00002C9.33333 4.7364 9.93029 5.33335 10.6667 5.33335ZM6.66667 8.00002C6.66667 8.7364 6.06971 9.33335 5.33333 9.33335C4.59695 9.33335 4 8.7364 4 8.00002C4 7.26364 4.59695 6.66669 5.33333 6.66669C6.06971 6.66669 6.66667 7.26364 6.66667 8.00002ZM10.6667 9.33335C11.403 9.33335 12 8.7364 12 8.00002C12 7.26364 11.403 6.66669 10.6667 6.66669C9.93029 6.66669 9.33333 7.26364 9.33333 8.00002C9.33333 8.7364 9.93029 9.33335 10.6667 9.33335ZM6.66667 12C6.66667 12.7364 6.06971 13.3334 5.33333 13.3334C4.59695 13.3334 4 12.7364 4 12C4 11.2636 4.59695 10.6667 5.33333 10.6667C6.06971 10.6667 6.66667 11.2636 6.66667 12ZM10.6667 13.3334C11.403 13.3334 12 12.7364 12 12C12 11.2636 11.403 10.6667 10.6667 10.6667C9.93029 10.6667 9.33333 11.2636 9.33333 12C9.33333 12.7364 9.93029 13.3334 10.6667 13.3334Z"
                />
              </svg>
            </button>
            <span>{{ categoryRow.categoryName }}</span>
          </div>
          <div class="category-foot">
            <el-tag :type="categoryRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
              {{ statusLabel(categoryRow.status) }}
            </el-tag>
            <el-button v-if="canSave" link type="primary" @click="openEdit(categoryRow)">编辑</el-button>
          </div>
        </div>
      </article>
    </div>
    <el-dialog v-model="dialogVisible" :title="isEmpty(editingCategoryId) ? '新建分类' : '编辑分类'" width="420px">
      <el-form label-position="top">
        <el-form-item label="名称"><el-input v-model="categoryForm.categoryName" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="categoryForm.status">
            <el-option label="启用" :value="RecordStatus.ENABLED" />
            <el-option label="停用" :value="RecordStatus.DISABLED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { useDragSort } from '../../../hooks/drag-sort';
import { PermissionCode, RecordStatus, statusLabel } from '../../../utils/constants';
import { isEmpty } from '../../../utils/tools';
import { useSessionStore } from '../../../stores/session';
import http from '../../../utils/request';

interface CategoryRow {
  categoryId: string;
  categoryName: string;
  sortOrder: number;
  status: string;
}

const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.STORE_CATEGORY_SAVE);
const categoryList = ref<CategoryRow[]>([]);
const sortListRef = ref<HTMLElement | null>(null);
const dialogVisible = ref(false);
const editingCategoryId = ref('');
const categoryForm = reactive({
  categoryName: '',
  status: RecordStatus.ENABLED as string,
});
const { initDragSort } = useDragSort(
  () => sortListRef.value,
  () => canSave === true,
  saveCategorySort,
);

/**
 * 查询当前门店全部分类。
 */
async function loadCategories(): Promise<void> {
  categoryList.value = (await http.get('/admin/store/product-categories')) as CategoryRow[];
  await initDragSort();
}

/**
 * 打开新建分类。
 */
function openCreate(): void {
  editingCategoryId.value = '';
  categoryForm.categoryName = '';
  categoryForm.status = RecordStatus.ENABLED;
  dialogVisible.value = true;
}

/**
 * 打开编辑分类。
 */
function openEdit(categoryRow: CategoryRow): void {
  editingCategoryId.value = categoryRow.categoryId;
  categoryForm.categoryName = categoryRow.categoryName;
  categoryForm.status = categoryRow.status;
  dialogVisible.value = true;
}

/**
 * 保存分类。
 */
async function saveCategory(): Promise<void> {
  const body = {
    categoryName: categoryForm.categoryName,
    status: categoryForm.status,
  };
  if (isEmpty(editingCategoryId.value)) {
    await http.post('/admin/store/product-categories', body);
  } else {
    await http.put(`/admin/store/product-categories/${editingCategoryId.value}`, body);
  }
  dialogVisible.value = false;
  await loadCategories();
}

/**
 * 按拖动后的编号顺序保存分类。失败时重新查询。
 */
async function saveCategorySort(idList: string[]): Promise<void> {
  categoryList.value = idList.flatMap((recordId) => {
    const categoryRow = categoryList.value.find((item) => item.categoryId === recordId);
    if (isEmpty(categoryRow)) {
      return [];
    }
    return [categoryRow];
  });
  try {
    await http.put('/admin/store/product-categories/sort', { idList });
  } catch (error) {
    void error;
    await loadCategories();
  }
}

onMounted(() => {
  void loadCategories();
});
</script>

<style scoped>
.category-toolbar {
  margin-bottom: 12px;
}

.category-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.category-card {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 14px;
}

.category-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  word-break: break-word;
}

.drag-icon {
  display: inline-flex;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  padding: 0;
  color: #98a2b3;
  cursor: move;
  background: transparent;
  border: none;
}

.drag-icon svg {
  width: 16px;
  height: 16px;
}

.category-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.record-empty {
  color: var(--el-text-color-secondary);
  padding: 24px 0;
  text-align: center;
}
</style>
