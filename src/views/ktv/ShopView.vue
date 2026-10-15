<template>
  <el-card>
    <el-button v-if="canSave" type="primary" @click="openCreate">新建门店</el-button>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(shopList)" class="record-empty">暂无数据</div>
      <RecordCard v-for="shopRow in shopList" :key="shopRow.shopId">
        <RecordField label="编码">{{ shopRow.shopCode }}</RecordField>
        <RecordField label="名称">{{ shopRow.shopName }}</RecordField>
        <RecordField label="地址">{{ shopRow.address }}</RecordField>
        <RecordField label="电话">{{ shopRow.contactPhone }}</RecordField>
        <RecordField label="状态">
          <el-tag :type="shopRow.status === RecordStatus.ENABLED ? 'success' : 'info'" effect="plain">
            {{ statusLabel(shopRow.status) }}
          </el-tag>
        </RecordField>
        <template v-if="canSave" #actions>
          <el-button link type="primary" @click="openEdit(shopRow)">编辑</el-button>
        </template>
      </RecordCard>
    </div>
    <el-dialog v-model="dialogVisible" :title="editingShopId === '' ? '新建门店' : '编辑门店'" width="480px">
      <el-form label-position="top">
        <el-form-item label="编码"><el-input v-model="shopForm.shopCode" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="shopForm.shopName" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="shopForm.address" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="shopForm.contactPhone" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="shopForm.status">
            <el-option label="启用" :value="RecordStatus.ENABLED" />
            <el-option label="停用" :value="RecordStatus.DISABLED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveShop">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import RecordCard from '../../components/RecordCard.vue';
import RecordField from '../../components/RecordField.vue';
import { PermissionCode, RecordStatus, statusLabel } from '../../utils/constants';
import { isEmpty } from '../../utils/tools';
import { useSessionStore } from '../../stores/session';
import http from '../../utils/request';

interface ShopRow {
  shopId: string;
  shopCode: string;
  shopName: string;
  address: string;
  contactPhone: string;
  status: string;
}

const router = useRouter();
const sessionStore = useSessionStore();
const canSave = sessionStore.hasPermission(PermissionCode.KTV_SHOP_SAVE);
const shopList = ref<ShopRow[]>([]);
const dialogVisible = ref(false);
const editingShopId = ref('');
const shopForm = reactive({
  shopCode: '',
  shopName: '',
  address: '',
  contactPhone: '',
  status: RecordStatus.ENABLED as string,
});

/**
 * 查询已绑定的 KTV 门店。
 */
async function loadShops(): Promise<void> {
  shopList.value = (await http.get('/admin/ktv/shops')) as ShopRow[];
}

/**
 * 打开新建弹窗。
 */
function openCreate(): void {
  editingShopId.value = '';
  shopForm.shopCode = '';
  shopForm.shopName = '';
  shopForm.address = '';
  shopForm.contactPhone = '';
  shopForm.status = RecordStatus.ENABLED;
  dialogVisible.value = true;
}

/**
 * 打开编辑弹窗。
 */
function openEdit(shopRow: ShopRow): void {
  editingShopId.value = shopRow.shopId;
  shopForm.shopCode = shopRow.shopCode;
  shopForm.shopName = shopRow.shopName;
  shopForm.address = shopRow.address;
  shopForm.contactPhone = shopRow.contactPhone;
  shopForm.status = shopRow.status;
  dialogVisible.value = true;
}

/**
 * 保存门店。新建后刷新登录态，让新门店出现在切换器里。
 */
async function saveShop(): Promise<void> {
  if (isEmpty(editingShopId.value)) {
    await http.post('/admin/ktv/shops', shopForm);
    sessionStore.menuLoaded = false;
    await sessionStore.loadSession(router);
  } else {
    await http.put(`/admin/ktv/shops/${editingShopId.value}`, shopForm);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  await loadShops();
}

onMounted(() => {
  void loadShops();
});
</script>

<style scoped>
.record-list {
  margin-top: 16px;
}
</style>
