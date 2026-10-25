<template>
  <ShopSwitcher />
  <el-card>
    <QueryBar @search="searchReviews" @reset="resetQuery">
      <el-form-item>
        <el-button-group class="review-date-quick">
          <el-button @click="applyQuickDate('today')">今天</el-button>
          <el-button @click="applyQuickDate('last7')">近7天</el-button>
          <el-button @click="applyQuickDate('month')">本月</el-button>
        </el-button-group>
      </el-form-item>
      <el-form-item>
        <el-date-picker
          v-model="reviewDateRange"
          class="review-date-range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          single-panel
        />
      </el-form-item>
    </QueryBar>
    <div v-if="isEmpty(reviewList)" class="record-empty">暂无数据</div>
    <div v-else class="review-list">
      <article v-for="reviewRow in reviewList" :key="reviewRow.reviewId" class="review-card">
        <div class="review-top">
          <div>
            <div class="review-star">{{ starText(reviewRow.starRating) }}</div>
            <div class="review-meta">
              {{ reviewRow.username }}
              · {{ reviewRow.bizOrderNo }}
              · {{ formatLocalDateTime(reviewRow.createdAt) }}
            </div>
          </div>
        </div>
        <div class="review-content">{{ displayText(reviewRow.content) }}</div>
      </article>
    </div>
    <ListPager :total="total" :current-page="page" :page-size="pageSize" @current-change="onPageChange" />
  </el-card>
</template>

<script setup lang="ts">
import { HotelApi } from '../../../api/hotel';
import { onMounted, ref } from 'vue';
import ListPager from '../../../components/ListPager/ListPager.vue';
import QueryBar from '../../../components/QueryBar/QueryBar.vue';
import ShopSwitcher from '../../../components/ShopSwitcher/ShopSwitcher.vue';
import { PageSetting } from '../../../utils/constants';
import { formatLocalDateTime, isEmpty } from '../../../utils/tools';
import http from '../../../utils/request';

interface ReviewRow {
  reviewId: string;
  username: string;
  bizOrderNo: string;
  starRating: number;
  content: string;
  createdAt: string;
}

const reviewList = ref<ReviewRow[]>([]);
const total = ref(0);
const page = ref(PageSetting.DEFAULT_PAGE);
const pageSize = ref(PageSetting.DEFAULT_PAGE_SIZE);
const reviewDateRange = ref<[string, string] | null>(null);
const appliedStartDate = ref('');
const appliedEndDate = ref('');

/**
 * 空文本显示成横线。
 */
function displayText(text: string): string {
  if (isEmpty(text)) {
    return '—';
  }
  return text;
}

/**
 * 星级显示成星号。
 */
function starText(starRating: number): string {
  if (Number.isFinite(starRating) !== true || starRating < 1) {
    return '—';
  }
  return '★'.repeat(starRating);
}

/**
 * 日期数字补成两位。
 */
function padDatePart(datePart: number): string {
  return String(datePart).padStart(2, '0');
}

/**
 * 把本地日期格式化成 YYYY-MM-DD。
 */
function formatLocalDateText(dateValue: Date): string {
  const yearText = String(dateValue.getFullYear());
  const monthText = padDatePart(dateValue.getMonth() + 1);
  const dayText = padDatePart(dateValue.getDate());
  return `${yearText}-${monthText}-${dayText}`;
}

/**
 * 今天到今天。
 */
function todayDateRange(): [string, string] {
  const todayText = formatLocalDateText(new Date());
  return [todayText, todayText];
}

/**
 * 近 7 天（含今天）到今天。
 */
function last7DaysDateRange(): [string, string] {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  return [formatLocalDateText(startDate), formatLocalDateText(today)];
}

/**
 * 本月 1 日到今天。
 */
function currentMonthDateRange(): [string, string] {
  const today = new Date();
  const yearText = String(today.getFullYear());
  const monthText = padDatePart(today.getMonth() + 1);
  const dayText = padDatePart(today.getDate());
  return [`${yearText}-${monthText}-01`, `${yearText}-${monthText}-${dayText}`];
}

/**
 * 取出查询栏里的开始和结束日期。没选时两端都为空。
 */
function readReviewDateQuery(): { startDate: string; endDate: string } {
  if (isEmpty(reviewDateRange.value)) {
    return { startDate: '', endDate: '' };
  }
  return {
    startDate: reviewDateRange.value[0],
    endDate: reviewDateRange.value[1],
  };
}

/**
 * 点快捷日期后立刻按新范围查询。
 */
function applyQuickDate(quickDateKind: 'today' | 'last7' | 'month'): void {
  if (quickDateKind === 'today') {
    reviewDateRange.value = todayDateRange();
  } else if (quickDateKind === 'last7') {
    reviewDateRange.value = last7DaysDateRange();
  } else {
    reviewDateRange.value = currentMonthDateRange();
  }
  searchReviews();
}

/**
 * 分页查询当前门店评价。
 */
async function loadReviews(): Promise<void> {
  const pageResult = (await http.get(HotelApi.REVIEWS, {
    params: {
      page: page.value,
      pageSize: pageSize.value,
      startDate: appliedStartDate.value,
      endDate: appliedEndDate.value,
    },
  })) as { list: ReviewRow[]; total: number };
  reviewList.value = pageResult.list;
  total.value = pageResult.total;
}

/**
 * 应用时间筛选后从第 1 页查。
 */
function searchReviews(): void {
  const reviewDateQuery = readReviewDateQuery();
  appliedStartDate.value = reviewDateQuery.startDate;
  appliedEndDate.value = reviewDateQuery.endDate;
  page.value = PageSetting.DEFAULT_PAGE;
  void loadReviews();
}

/**
 * 清空时间筛选后重新查。
 */
function resetQuery(): void {
  reviewDateRange.value = null;
  appliedStartDate.value = '';
  appliedEndDate.value = '';
  page.value = PageSetting.DEFAULT_PAGE;
  void loadReviews();
}

/**
 * 翻页。
 */
function onPageChange(nextPage: number): void {
  page.value = nextPage;
  void loadReviews();
}

onMounted(() => {
  void loadReviews();
});
</script>

<style scoped>
.review-date-range {
  --el-date-editor-daterange-width: 260px;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-card {
  padding: 14px;
  border: 1px solid #e6e8ec;
  border-radius: 8px;
  background: #fff;
}

.review-star {
  color: #f59e0b;
  font-size: 16px;
  letter-spacing: 1px;
}

.review-meta {
  margin-top: 4px;
  color: #667085;
  font-size: 13px;
}

.review-content {
  margin-top: 10px;
  color: #344054;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.record-empty {
  padding: 32px 0;
  text-align: center;
  color: #98a2b3;
}
</style>
