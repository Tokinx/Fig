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
    <SelectContent>
      <SelectItem v-for="locale in supportedLocales" :key="locale.code" :value="locale.code">
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
  // 刷新页面以确保所有内容都更新
  window.location.reload();
};
</script>
