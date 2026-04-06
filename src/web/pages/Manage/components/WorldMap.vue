<script setup>
import { computed, ref, onMounted } from "vue";
import { use } from "echarts/core";
import { MapChart } from "echarts/charts";
import { VisualMapComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";
import { useI18n } from "vue-i18n";
import * as echarts from "echarts/core";

// 注册 ECharts 组件
use([MapChart, VisualMapComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps({
  countries: {
    type: Array,
    default: () => [],
  },
});

const { t, locale } = useI18n();
const mapReady = ref(false);

const maxVisits = computed(() => Math.max(...props.countries.map((c) => Number(c.visits || 0)), 0));

const regionNames = computed(() => {
  if (typeof Intl.DisplayNames !== "function") return null;
  return new Intl.DisplayNames([locale.value, "en"], { type: "region" });
});

const getCountryName = (code) => {
  const normalized = String(code || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return code;
  try {
    return regionNames.value?.of(normalized) || normalized;
  } catch {
    return normalized;
  }
};

const topCountries = computed(() => {
  return props.countries
    .slice(0, 8)
    .map((c) => ({
      code: c.label,
      name: getCountryName(c.label),
      visits: Number(c.visits || 0),
      share: maxVisits.value ? (Number(c.visits || 0) / maxVisits.value) : 0,
    }));
});

const formatter = new Intl.NumberFormat();

// ISO alpha-2 代码到 ECharts 国家名称的映射
const isoToEchartsName = (isoCode) => {
  const code = String(isoCode || "").toUpperCase();

  // ECharts 使用的特殊国家名称映射
  const specialNames = {
    "US": "United States",
    "GB": "United Kingdom",
    "CN": "China",
    "RU": "Russia",
    "KR": "South Korea",
    "KP": "North Korea",
    "CD": "Dem. Rep. Congo",
    "CG": "Congo",
    "CF": "Central African Rep.",
    "SS": "South Sudan",
    "TZ": "Tanzania",
    "DO": "Dominican Rep.",
    "BA": "Bosnia and Herz.",
    "GQ": "Eq. Guinea",
    "LA": "Lao PDR",
    "PS": "Palestine",
    "SB": "Solomon Is.",
    "FK": "Falkland Is.",
    "TL": "Timor-Leste",
    "CV": "Cabo Verde",
    "CZ": "Czechia",
  };

  if (specialNames[code]) {
    return specialNames[code];
  }

  // 对于其他国家，尝试使用 Intl.DisplayNames 获取英文名称
  try {
    const englishNames = new Intl.DisplayNames(["en"], { type: "region" });
    return englishNames.of(code) || code;
  } catch {
    return code;
  }
};

// 转换数据为 ECharts 格式
const mapData = computed(() => {
  return props.countries
    .filter((c) => c.label && Number(c.visits || 0) > 0)
    .map((c) => ({
      name: isoToEchartsName(c.label),
      value: Number(c.visits || 0),
    }));
});

// ECharts 配置
const option = computed(() => ({
  tooltip: {
    trigger: "item",
    formatter: (params) => {
      if (!params.value) return "";
      const countryName = getCountryName(params.name);
      return `<strong>${countryName}</strong><br/>${formatter.format(params.value)} ${t("stats.visits")}`;
    },
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    textStyle: {
      color: "#0f172a",
      fontSize: 12,
    },
    padding: [8, 12],
  },
  visualMap: {
    show: false,
    min: 0,
    max: maxVisits.value || 100,
    inRange: {
      color: ["#e0f2fe", "#0284c7", "#0369a1"],
    },
    calculable: false,
  },
  series: [
    {
      type: "map",
      map: "world",
      roam: true,
      scaleLimit: {
        min: 0.5,
        max: 5,
      },
      emphasis: {
        label: {
          show: false,
        },
        itemStyle: {
          areaColor: "#0284c7",
          borderColor: "#0369a1",
          borderWidth: 1,
        },
      },
      itemStyle: {
        areaColor: "#cbd5e1",
        borderColor: "#94a3b8",
        borderWidth: 0.5,
      },
      data: mapData.value,
    },
  ],
}));

// 加载并注册世界地图
onMounted(async () => {
  try {
    const response = await fetch("https://fastly.jsdelivr.net/gh/apache/echarts-www@master/asset/map/json/world.json");
    const geoJSON = await response.json();
    echarts.registerMap("world", geoJSON);
    mapReady.value = true;
  } catch (error) {
    console.error("Failed to load world map:", error);
  }
});
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-slate-50/50">
    <!-- 左侧国家列表 -->
    <div class="absolute left-3 top-3 z-10 w-60 rounded-md bg-white/50 shadow-sm backdrop-blur-lg">
      <div class="border-b border-slate-500/10 mx-3">
        <slot name="left-top"></slot>
      </div>
      <div class="max-h-64 overflow-y-auto p-2">
        <div v-if="topCountries.length === 0" class="px-2 py-4 text-center text-xs text-slate-400">
          {{ t("stats.noBreakdown") }}
        </div>
        <div v-for="country in topCountries" :key="country.code" class="mb-1 rounded px-2 py-1.5 hover:bg-slate-50">
          <div class="flex items-center justify-between gap-2">
            <span class="truncate text-sm text-slate-700">{{ country.name }}</span>
            <span class="shrink-0 text-xs font-semibold text-slate-900">{{ formatter.format(country.visits) }}</span>
          </div>
          <div class="mt-1 h-1 overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full bg-gradient-to-r from-sky-500 to-cyan-600"
              :style="{ width: `${Math.max(country.share * 100, 8)}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ECharts 地图 -->
    <div v-if="!mapReady" class="flex h-full w-full items-center justify-center text-sm text-slate-500">
      {{ t("stats.loading") }}
    </div>
    <VChart v-else class="h-full w-full" :option="option" autoresize />
  </div>
</template>
