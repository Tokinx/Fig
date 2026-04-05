<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from "vue";
import { Button } from "@/components/ui/button";
import SlugCard from "./SlugCard.vue";
import CreateLinkDialog from "./CreateLinkDialog.vue";
import { useI18n } from 'vue-i18n';

import { openLinkPanel } from "./use-link-panel";
import { getModeList } from "@/lib/link-config";

const { t } = useI18n();

const loading = ref(false);
const loadingMore = ref(false);
const tableData = ref([]);
const pagination = ref({ count: 0, page: 1, rows: 10 });
const currentSearch = ref('');
const currentFilter = ref('all');
const hasMore = ref(true);
let activeRequestId = 0;

const buildRequestBody = (page, searchQuery = currentSearch.value, filterMode = currentFilter.value) => {
  const requestBody = {
    rows: pagination.value.rows,
    page,
  };

  if (searchQuery) {
    requestBody.search = searchQuery;
  }

  if (filterMode && filterMode !== 'all') {
    requestBody.mode = filterMode;
  }

  return requestBody;
};

const mapResults = (results = [], oidPrefix = Math.random().toString(36).substring(2)) => {
  return results.map((x) => {
    let value = {};
    try {
      value = JSON.parse(x.value);
    } catch (e) {
      console.log(e);
    }

    return { ...x, ...value, oid: oidPrefix + x.key };
  });
};

const updateHasMore = (latestSize, totalCount = pagination.value.count) => {
  hasMore.value = latestSize === pagination.value.rows && tableData.value.length < totalCount;
};

const fetchPage = async (page, searchQuery = currentSearch.value, filterMode = currentFilter.value) => {
  const response = await fetch(`/api/?action=get`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRequestBody(page, searchQuery, filterMode)),
  });

  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new Error(result.msg || "Failed to fetch links");
  }

  const { count = 0, results = [] } = result.data || {};
  return {
    count,
    items: mapResults(results),
  };
};

const hasVerticalScrollbar = () => {
  const doc = document.documentElement;
  const body = document.body;
  const scrollHeight = Math.max(doc.scrollHeight, body?.scrollHeight || 0);
  const clientHeight = window.innerHeight || doc.clientHeight;
  return scrollHeight > clientHeight + 1;
};

const ensureScrollable = async (requestId = activeRequestId) => {
  await nextTick();

  while (requestId === activeRequestId && hasMore.value && !loading.value && !loadingMore.value && !hasVerticalScrollbar()) {
    const loaded = await loadMore({ requestId, skipEnsureScrollable: true });
    if (!loaded) {
      break;
    }

    await nextTick();
  }
};

const refresh = async (searchQuery = '', filterMode = 'all') => {
  const requestId = ++activeRequestId;
  loading.value = true;

  // 重置数据
  pagination.value.page = 1;
  pagination.value.count = 0;
  tableData.value = [];
  hasMore.value = true;

  try {
    const { count, items } = await fetchPage(1, searchQuery, filterMode);
    if (requestId !== activeRequestId) {
      return;
    }

    pagination.value.count = count;
    tableData.value = items;
    updateHasMore(items.length, count);
  } catch (error) {
    if (requestId === activeRequestId) {
      hasMore.value = false;
      console.error("Failed to refresh links:", error);
    }
  } finally {
    if (requestId === activeRequestId) {
      loading.value = false;
    }
  }

  if (requestId === activeRequestId) {
    await ensureScrollable(requestId);
  }
};

const loadMore = async ({ requestId = activeRequestId, skipEnsureScrollable = false } = {}) => {
  if (loading.value || loadingMore.value || !hasMore.value) return false;

  loadingMore.value = true;
  let loaded = false;
  const nextPage = pagination.value.page + 1;

  try {
    const { count, items } = await fetchPage(nextPage);
    if (requestId !== activeRequestId) {
      return false;
    }

    pagination.value.count = count;

    if (items.length > 0) {
      tableData.value.push(...items);
      pagination.value.page = nextPage;
      updateHasMore(items.length, count);
      loaded = true;
    } else {
      hasMore.value = false;
    }
  } catch (error) {
    if (requestId === activeRequestId) {
      console.error("Failed to load more links:", error);
    }
  } finally {
    loadingMore.value = false;
  }

  if (loaded && !skipEnsureScrollable && requestId === activeRequestId) {
    await ensureScrollable(requestId);
  }

  return loaded;
};

// 搜索方法
const search = (query, filterMode = 'all') => {
  currentSearch.value = query;
  currentFilter.value = filterMode;
  refresh(query, filterMode);
};

// 筛选方法
const filter = (query, filterMode) => {
  currentSearch.value = query;
  currentFilter.value = filterMode;
  refresh(query, filterMode);
};

const refreshCurrentResults = () => refresh(currentSearch.value, currentFilter.value);

const createLink = () => {
  openLinkPanel()
    .then(() => {
      refreshCurrentResults();
    })
    .catch(() => {
      // 用户取消或创建失败，不需要刷新
    });
};

// 获取模式标签 - 使用计算属性确保响应式
const getModeLabel = computed(() => (mode) => {
  const modeOption = getModeList().find(m => m.value === mode);
  return modeOption ? modeOption.label : mode;
});

const getScrollMetrics = () => {
  const doc = document.documentElement;
  const body = document.body;

  return {
    scrollTop: window.scrollY || doc.scrollTop || body?.scrollTop || 0,
    scrollHeight: Math.max(doc.scrollHeight, body?.scrollHeight || 0),
    clientHeight: window.innerHeight || doc.clientHeight,
  };
};

// 滚动事件处理
const handleScroll = () => {
  const { scrollTop, scrollHeight, clientHeight } = getScrollMetrics();
  // 当滚动到底部附近时(距离底部200px内)触发加载
  if (scrollTop + clientHeight >= scrollHeight - 200 && hasMore.value && !loadingMore.value && !loading.value) {
    loadMore();
  }
};

onMounted(() => {
  refresh();
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

defineExpose({ refresh, search, filter, createLink });
</script>
<template>
  <div class="w-full">
    <!-- 搜索/筛选状态提示 -->
    <div v-if="currentSearch" class="mb-6 p-4 bg-muted/50 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          <span v-if="currentSearch && currentFilter !== 'all'">
            {{ t('table.searchInType', {
              query: currentSearch, type: getModeLabel.value(currentFilter), count:
                pagination.count }) }}
          </span>
          <span v-else-if="currentSearch">
            {{ t('table.searchResults', { query: currentSearch, count: pagination.count }) }}
          </span>
          <span v-else-if="currentFilter !== 'all'">
            {{ t('table.filterResults', { type: getModeLabel.value(currentFilter), count: pagination.count }) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="mb-6 text-center text-muted-foreground">
      <div class="flex items-center justify-center gap-2">
        <i class="icon-[material-symbols--progress-activity] animate-spin h-4 w-4" />
        <span>{{ t('table.searching') }}</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="tableData.length === 0" class="text-center py-24">
      <div class="max-w-md mx-auto space-y-6">
        <div class="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
          <i class="icon-[material-symbols--link] h-10 w-10 text-muted-foreground" />
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-semibold tracking-tight">
            {{ (currentSearch || currentFilter !== 'all') ? t('table.noResults') : t('table.noData') }}
          </h3>
          <p class="text-muted-foreground">
            {{ (currentSearch || currentFilter !== 'all') ? t('table.tryAdjustFilters') : t('table.createFirstLink') }}
          </p>
        </div>
        <div v-if="!(currentSearch || currentFilter !== 'all')">
          <Button @click="createLink" class="gap-2">
            <i class="icon-[material-symbols--add] h-4 w-4" />
            {{ t('table.createLink') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- 结果列表 -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <SlugCard v-for="item in tableData" :key="item.oid" v-bind="{ item }" @refresh="refreshCurrentResults" />
    </div>

    <!-- 加载更多指示器 -->
    <div v-if="tableData.length > 0" class="mt-8 text-center">
      <div v-if="loadingMore" class="flex items-center justify-center gap-2 py-4 text-muted-foreground">
        <i class="icon-[material-symbols--progress-activity] animate-spin h-4 w-4" />
        <span>{{ t('table.loadingMore') }}</span>
      </div>
      <div v-else-if="!hasMore" class="py-4 text-muted-foreground text-sm flex items-center justify-center">
        <i class="icon-[material-symbols--check-circle] h-4 w-4 mr-1" />
        {{ t('table.allRecordsShown', { count: tableData.length }) }}
      </div>
      <div v-else class="py-4 flex items-center justify-center">
        <Button type="button" variant="ghost" class="rounded-full gap-1 text-muted-foreground text-sm"
          @click="loadMore">
          <i class="icon-[material-symbols--keyboard-arrow-down] h-4 w-4" />
          {{ t('table.scrollToLoadMore') }}
        </Button>
      </div>
    </div>

    <!-- 创建链接弹窗 -->
    <CreateLinkDialog />
  </div>
</template>
