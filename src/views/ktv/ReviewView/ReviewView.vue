<template>
  <ShopSwitcher />
  <el-card>
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
import { KtvApi } from '../../../api/ktv';
import { onMounted, ref } from 'vue';
import ListPager from '../../../components/ListPager/ListPager.vue';
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
 * 分页查询当前门店评价。
 */
async function loadReviews(): Promise<void> {
  const pageResult = (await http.get(KtvApi.REVIEWS, {
    params: { page: page.value, pageSize: pageSize.value },
  })) as { list: ReviewRow[]; total: number };
  reviewList.value = pageResult.list;
  total.value = pageResult.total;
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
