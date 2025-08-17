<script setup>
import { ref, h, watch } from "vue";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { toast } from "@/components/ui/toast/use-toast";
// import { alert } from "@/components/Alert/use-alert";
import SlugItems from "./components/SlugItems.vue";
// use-link-panel
import { openLinkPanel } from "./components/use-link-panel";

const originalUrl = location.host;
const table = ref(null);
const focusState = ref(false);
const searchQuery = ref('');
const lastSearched = ref(''); // 记录上次搜索的内容

const handleCreateLink = () => {
  // 打开创建链接的面板
  openLinkPanel()
    .then(() => {
      // 创建成功后刷新列表
      if (table.value) {
        table.value.refresh(searchQuery.value.trim());
      }
    })
    .catch(() => {
      // 用户取消或创建失败，不需要刷新
    });
};

// 处理搜索
const handleSearch = () => {
  if (table.value && searchQuery.value.trim() !== lastSearched.value) {
    lastSearched.value = searchQuery.value.trim();
    table.value.search(lastSearched.value);
  }
};

// 清空搜索
const clearSearch = () => {
  searchQuery.value = '';
  lastSearched.value = '';
  if (table.value) {
    table.value.search('');
  }
};

// 监听输入框清空
watch(searchQuery, (newValue) => {
  if (!newValue.trim() && lastSearched.value) {
    clearSearch();
  }
});
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="container">
      <div class="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div class="flex h-16 items-center justify-between">
          <h1 class="text-xl font-semibold tracking-tight">{{ originalUrl }}</h1>
          <div class="flex items-center gap-3">
            <form class="relative w-9" @submit.prevent="handleSearch">
              <Input id="search" v-model="searchQuery" @focus="focusState = true" @blur="focusState = false"
                @keydown.enter="handleSearch" autocomplete="off" />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button v-if="searchQuery" type="button" variant="ghost" size="icon" class="h-6 w-6"
                  @click="clearSearch">
                  <i class="icon-[material-symbols--close] h-3 w-3" />
                </Button>
              </div>
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <i class="icon-[material-symbols--search] text-xl" />
              </div>
            </form>

            <Button @click="handleCreateLink" class="gap-2 shrink-0 px-2 sm:px-4">
              <i class="icon-[material-symbols--add] text-xl" />
              <span class="hidden sm:inline">创建短链接</span>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <main class="container py-6">
      <SlugItems ref="table" />
    </main>
  </div>
</template>
