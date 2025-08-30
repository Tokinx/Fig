<script setup>
import { ref, h, watch } from "vue";
import { useRouter } from "vue-router";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SlugItems from "./components/SlugItems.vue";
import { openLinkPanel } from "./components/use-link-panel";
import { modeList } from "@/lib/link-config";

const router = useRouter();
const originalUrl = location.host;
const table = ref(null);
const focusState = ref(false);
const searchQuery = ref("");
const lastSearched = ref(""); // 记录上次搜索的内容
const filterMode = ref("all"); // 筛选模式

const handleCreateLink = () => {
  // 打开创建链接的面板
  openLinkPanel()
    .then(() => {
      // 创建成功后刷新列表
      if (table.value) {
        table.value.refresh(searchQuery.value.trim(), filterMode.value);
      }
    })
    .catch(() => {
      // 用户取消或创建失败，不需要刷新
    });
};

// 前往首页
const goToCreate = () => {
  router.push('/home');
};

// 处理搜索
const handleSearch = () => {
  if (table.value && searchQuery.value.trim() !== lastSearched.value) {
    lastSearched.value = searchQuery.value.trim();
    table.value.search(lastSearched.value, filterMode.value);
  }
};

// 清空搜索
const clearSearch = () => {
  searchQuery.value = "";
  lastSearched.value = "";
  if (table.value) {
    table.value.search("", filterMode.value);
  }
};

// 处理筛选模式变化
const handleFilterChange = (mode) => {
  filterMode.value = mode;
  if (table.value) {
    table.value.filter(searchQuery.value.trim(), mode);
  }
};

// 监听输入框清空
watch(searchQuery, (newValue) => {
  if (!newValue.trim() && lastSearched.value) {
    clearSearch();
  }
});

// 获取模式选项，添加"全部"选项
const modeOptions = [
  { value: "all", label: "全部类型", description: "显示所有跳转模式的短链接" },
  ...modeList
];
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="container px-4">
      <div class="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-semibold tracking-tight">{{ originalUrl }}</h1>
            <span class="text-muted-foreground">/ 管理短链接</span>
          </div>

          <!-- 搜索和筛选区域 -->
          <div class="flex items-center gap-3 flex-1 max-w-lg mx-4">
            <!-- 筛选下拉框 -->
            <Select :model-value="filterMode" @update:model-value="handleFilterChange">
              <SelectTrigger class="w-36">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in modeOptions" :key="option.value" :value="option.value">
                  <div class="flex items-center gap-2">
                    <i v-if="option.icon" :class="option.icon + ' h-4 w-4'" />
                    <span>{{ option.label }}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- 搜索框 -->
            <form class="relative flex-1" @submit.prevent="handleSearch">
              <Input
                id="search"
                v-model="searchQuery"
                @focus="focusState = true"
                @blur="focusState = false"
                @keydown.enter="handleSearch"
                placeholder="搜索短链接..."
                autocomplete="off"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button v-if="searchQuery" type="button" variant="ghost" size="icon" class="h-6 w-6" @click="clearSearch">
                  <i class="icon-[material-symbols--close] h-4 w-4" />
                </Button>
                <Button v-else type="button" variant="ghost" size="icon" class="h-6 w-6" @click="handleSearch">
                  <i class="icon-[material-symbols--search] h-5 w-5" />
                </Button>
              </div>
            </form>
          </div>

          <!-- 操作按钮区域 -->
          <div class="flex items-center gap-3">
            <Button @click="goToCreate" variant="outline" class="gap-2 shrink-0 px-2 sm:px-4">
              <i class="icon-[material-symbols--add] text-xl" />
              <span class="hidden sm:inline">创建短链接</span>
            </Button>
            <Button @click="handleCreateLink" class="gap-2 shrink-0 px-2 sm:px-4">
              <i class="icon-[material-symbols--flash-on] text-xl" />
              <span class="hidden sm:inline">快速创建</span>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选状态提示 -->
    <div v-if="filterMode !== 'all' || searchQuery" class="container px-4 pt-4">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <i class="icon-[material-symbols--filter-list] h-4 w-4" />
        <span>当前筛选：</span>
        <span v-if="filterMode !== 'all'" class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
          <i v-if="modeList.find(m => m.value === filterMode)?.icon" 
             :class="modeList.find(m => m.value === filterMode)?.icon + ' h-3 w-3'" />
          {{ modeList.find(m => m.value === filterMode)?.label }}
        </span>
        <span v-if="searchQuery" class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md">
          <i class="icon-[material-symbols--search] h-3 w-3" />
          "{{ searchQuery }}"
        </span>
        <Button 
          variant="ghost" 
          size="sm" 
          @click="() => { filterMode = 'all'; clearSearch(); }"
          class="h-6 px-2 text-xs"
        >
          清除筛选
        </Button>
      </div>
    </div>

    <main class="container px-4 py-6">
      <SlugItems ref="table" />
    </main>
  </div>
</template>