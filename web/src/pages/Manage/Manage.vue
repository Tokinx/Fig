<script setup>
import { ref, h, watch } from "vue";
import { useRouter } from "vue-router";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SlugItems from "./components/SlugItems.vue";
import { openLinkPanel } from "./components/use-link-panel";
import { getModeList } from "@/lib/link-config";
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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
const modeOptions = [{ value: "all", label: t('common.all') }, ...getModeList()];
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="border-b border-border">
      <div class="container px-4 h-32 flex flex-col">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-semibold tracking-tight">{{ originalUrl }}</h1>

            <LanguageSwitcher />
          </div>

          <!-- 搜索框 -->
          <form class="relative flex-1 ml-2 max-w-80" @submit.prevent="handleSearch">
            <Input
              id="search"
              v-model="searchQuery"
              @focus="focusState = true"
              @blur="focusState = false"
              @keydown.enter="handleSearch"
              :placeholder="t('shortLink.searchPlaceholder')"
              autocomplete="off"
              class="rounded-full pr-10"
            />
            <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                v-if="searchQuery"
                type="button"
                variant="ghost"
                size="icon"
                class="rounded-full h-6 w-6"
                @click="clearSearch"
              >
                <i class="icon-[material-symbols--close] h-4 w-4" />
              </Button>
              <Button
                v-else
                type="button"
                variant="ghost"
                size="icon"
                class="rounded-full h-6 w-6"
                @click="handleSearch"
              >
                <i class="icon-[material-symbols--search] h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
        <div class="flex-1"></div>
        <!-- 筛选 -->
        <div class="flex items-start gap-1">
          <div class="flex overflow-auto -ml-2">
            <div v-for="option in modeOptions" :key="option.value" class="shrink-0">
              <Button
                variant="text"
                size="sm"
                class="gap-2 h-7 rounded-full shrink-0"
                @click="handleFilterChange(option.value)"
              >
                <div class="flex items-center gap-2">
                  <span>{{ option.label }}</span>
                </div>
              </Button>
              <div
                class="mt-1 h-0.5 w-0 mx-auto rounded-lg transition-all"
                :class="{ 'bg-black !w-6': filterMode == option.value }"
              ></div>
            </div>
          </div>

          <div class="flex-1"></div>
          <div class="flex items-center gap-2">
            <Button @click="handleCreateLink" size="sm" class="gap-1 h-7 rounded-full">
              <i class="icon-[material-symbols--flash-on] text-sm" />
              <span>{{ t('common.create') }}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
    <main class="container p-4">
      <SlugItems ref="table" />
    </main>
  </div>
</template>
