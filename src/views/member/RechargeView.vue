<template>
  <el-card>
    <QueryBar @search="searchMember" @reset="resetQuery">
      <el-form-item>
        <el-input v-model="keyword" v-place class="query-keyword" placeholder="手机号 / 会员号 / 姓名" clearable />
      </el-form-item>
    </QueryBar>
    <div class="record-list record-list--wide-table">
      <div v-if="isEmpty(memberList)" class="record-empty">暂无数据</div>
      <RecordCard
        v-for="memberRow in memberList"
        :key="memberRow.memberId"
        :selected="selectedMemberId === memberRow.memberId"
        @click="onSelectMember(memberRow)"
      >
        <RecordField label="会员号">{{ memberRow.memberNo }}</RecordField>
        <RecordField label="姓名">{{ memberRow.memberName }}</RecordField>
        <RecordField label="手机号">{{ memberRow.mobile }}</RecordField>
        <RecordField label="当前余额">{{ memberRow.balance }}</RecordField>
      </RecordCard>
    </div>
    <el-form class="recharge-form" label-width="80px">
      <el-form-item label="充值金额">
        <el-input v-model="amount" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="remark" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :disabled="selectedMemberId === ''" @click="submitRecharge">确认充值</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import QueryBar from '../../components/QueryBar.vue';
import RecordCard from '../../components/RecordCard.vue';
import RecordField from '../../components/RecordField.vue';
import { PageSetting } from '../../utils/constants';
import { isEmpty } from '../../utils/tools';
import http from '../../utils/request';

interface MemberRow {
  memberId: string;
  memberNo: string;
  memberName: string;
  mobile: string;
  balance: string;
}

const keyword = ref('');
const memberList = ref<MemberRow[]>([]);
const selectedMemberId = ref('');
const amount = ref('');
const remark = ref('');

/**
 * 清空关键字并重新查找。
 */
function resetQuery(): void {
  keyword.value = '';
  void searchMember();
}

/**
 * 按关键字查找可充值的会员。
 */
async function searchMember(): Promise<void> {
  const pageResult = (await http.get('/admin/members', {
    params: { keyword: keyword.value, page: PageSetting.DEFAULT_PAGE, pageSize: PageSetting.DEFAULT_PAGE_SIZE },
  })) as { list: MemberRow[] };
  memberList.value = pageResult.list;
  selectedMemberId.value = '';
}

/**
 * 选中要充值的会员。
 */
function onSelectMember(memberRow: MemberRow | undefined): void {
  selectedMemberId.value = isEmpty(memberRow) ? '' : memberRow.memberId;
}

/**
 * 按当前门店给会员入账。
 */
async function submitRecharge(): Promise<void> {
  await http.post('/admin/members/recharge', {
    memberId: selectedMemberId.value,
    amount: amount.value,
    remark: remark.value,
  });
  ElMessage.success('充值成功');
  amount.value = '';
  remark.value = '';
  await searchMember();
}
</script>

<style scoped>
.recharge-form {
  margin-top: 24px;
  max-width: 480px;
}
</style>
