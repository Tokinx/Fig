<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import SlugCard from "./SlugCard.vue";
import CreateLinkDialog from "./CreateLinkDialog.vue";

import { state } from "./use-link-panel";
import { openLinkPanel } from "./use-link-panel";

const loading = ref(false);
const loadingMore = ref(false);
const tableData = ref([]);
const pagination = ref({ count: 0, page: 1, rows: 10 });
const currentSearch = ref('');
const hasMore = ref(true);

const refresh = async (searchQuery = '') => {
  const oid = Math.random().toString(36).substring(2);
  loading.value = true;
  
  // 重置数据
  pagination.value.page = 1;
  tableData.value = [];
  hasMore.value = true;

  const requestBody = {
    rows: pagination.value.rows,
    page: pagination.value.page,
  };

  // 如果有搜索关键词，添加到请求中
  if (searchQuery) {
    requestBody.search = searchQuery;
  }

  fetch(`/api/?action=get`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  })
    .then((res) => res.json())
    .then(({ data }) => {
      const { count, results } = data || {};
      pagination.value.count = count;
      const newItems = (results || []).map((x) => {
        let value = {};
        try {
          value = JSON.parse(x.value);
        } catch (e) {
          console.log(e);
        }
        // 不再获取点击统计，节省请求资源
        return { ...x, ...value, oid: oid + x.key };
      });
      
      tableData.value = newItems;
      
      hasMore.value = newItems.length === pagination.value.rows && tableData.value.length < count;
    })
    .finally(() => {
      loading.value = false;
    });
};

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return;
  
  loadingMore.value = true;
  pagination.value.page += 1;
  
  const requestBody = {
    rows: pagination.value.rows,
    page: pagination.value.page,
  };

  // 如果有搜索关键词，添加到请求中
  if (currentSearch.value) {
    requestBody.search = currentSearch.value;
  }

  fetch(`/api/?action=get`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  })
    .then((res) => res.json())
    .then(({ data }) => {
      const { results } = data || {};
      const oid = Math.random().toString(36).substring(2);
      const newItems = (results || []).map((x) => {
        let value = {};
        try {
          value = JSON.parse(x.value);
        } catch (e) {
          console.log(e);
        }
        // 不再获取点击统计，节省请求资源
        return { ...x, ...value, oid: oid + x.key };
      });
      
      if (newItems.length > 0) {
        tableData.value.push(...newItems);
        
        hasMore.value = newItems.length === pagination.value.rows && tableData.value.length < pagination.value.count;
      } else {
        hasMore.value = false;
      }
    })
    .finally(() => {
      loadingMore.value = false;
    });
};

// 搜索方法
const search = (query) => {
  currentSearch.value = query;
  refresh(query);
};

// 滚动事件处理
const handleScroll = () => {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
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

defineExpose({ refresh, search });
</script>
<template>
  <div class="w-full">
    <!-- 搜索状态提示 -->
    <div v-if="currentSearch" class="mb-6 p-4 bg-muted/50 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          正在搜索 "<span class="font-medium text-foreground">{{ currentSearch }}</span>"，找到 <span class="font-medium text-foreground">{{ pagination.count }}</span> 条结果
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="mb-6 text-center text-muted-foreground">
      <div class="flex items-center justify-center gap-2">
        <i class="icon-[material-symbols--progress-activity] animate-spin h-4 w-4" />
        <span>搜索中...</span>
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
            {{ currentSearch ? '没有找到匹配的结果' : '还没有短链接' }}
          </h3>
          <p class="text-muted-foreground">
            {{ currentSearch ? '尝试使用其他关键词搜索' : '点击下方按钮创建你的第一个短链接' }}
          </p>
        </div>
        <div v-if="!currentSearch">
          <Button @click="openLinkPanel" class="gap-2">
            <i class="icon-[material-symbols--add] h-4 w-4" />
            创建短链接
          </Button>
        </div>
      </div>
    </div>

    <!-- 结果列表 -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <SlugCard v-for="item in tableData" :key="item.oid" v-bind="{ item }" @refresh="() => refresh(currentSearch)" />
    </div>

    <!-- 加载更多指示器 -->
    <div v-if="tableData.length > 0" class="mt-8 text-center">
      <div v-if="loadingMore" class="flex items-center justify-center gap-2 py-4 text-muted-foreground">
        <i class="icon-[material-symbols--progress-activity] animate-spin h-4 w-4" />
        <span>正在加载更多...</span>
      </div>
      <div v-else-if="!hasMore" class="py-4 text-muted-foreground text-sm flex items-center justify-center">
        <i class="icon-[material-symbols--check-circle] h-4 w-4 mr-1" />
        已显示全部 {{ tableData.length }} 条记录
      </div>
      <div v-else class="py-4 text-muted-foreground text-sm flex items-center justify-center">
        <i class="icon-[material-symbols--keyboard-arrow-down] h-4 w-4 mr-1" />
        向下滚动加载更多
      </div>
    </div>

    <!-- 创建链接弹窗 -->
    <CreateLinkDialog />
  </div>
</template>
