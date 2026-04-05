<template>
  <Select :model-value="getCurrentLocale()" @update:model-value="handleLocaleChange">
    <SelectTrigger class="w-auto gap-2 h-8 rounded-full border-0 shadow-none">
      <SelectValue>
        <div class="flex items-center gap-2">
          <!-- <span>{{ currentLocale.flag }}</span> -->
          <span class="text-sm">{{ currentLocale.name }}</span>
        </div>
      </SelectValue>
    </SelectTrigger>
    <SelectContent class="p-1 rounded-2xl">
      <SelectItem
        v-for="locale in supportedLocales"
        :key="locale.code"
        :value="locale.code"
        class="rounded-full cursor-pointer"
      >
        <div class="flex items-center gap-2">
          <!-- <span>{{ locale.flag }}</span> -->
          <span>{{ locale.name }}</span>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
</template>

<script setup>
import { computed } from "vue";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supportedLocales, setLocale, getCurrentLocale } from "@/locales";

// 获取当前语言信息
const currentLocale = computed(() => {
  const current = getCurrentLocale();
  return supportedLocales.find((l) => l.code === current) || supportedLocales[0];
});

// 处理语言切换
const handleLocaleChange = (localeCode) => {
  setLocale(localeCode);
  // 不再刷新页面，依赖Vue i18n的响应式系统
};
</script>
