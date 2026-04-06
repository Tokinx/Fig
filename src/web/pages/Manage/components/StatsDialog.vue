<script setup>
import { computed, ref, watch } from "vue";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "vue-i18n";
import WorldMap from "./WorldMap.vue";
import PieChart from "./PieChart.vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  item: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update:visible"]);
const { t, locale } = useI18n();

const loading = ref(false);
const error = ref("");
const stats = ref(null);
const requestSequence = ref(0);
const rangePreset = ref("30d");

const startOfLocalDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addLocalDays = (value, days) => {
  const date = startOfLocalDay(value);
  date.setDate(date.getDate() + days);
  return date;
};

const formatter = new Intl.NumberFormat();
const decimalFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 0,
});
const precisePercentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

const closeDialog = (open) => {
  emit("update:visible", open);
};

const title = computed(() => props.item?.displayName || props.item?.slug || t("stats.analytics"));

const regionNames = computed(() => {
  if (typeof Intl.DisplayNames !== "function") return null;
  return new Intl.DisplayNames([locale.value, "en"], { type: "region" });
});

const rangeOptions = computed(() => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  const getMonthLabel = (offset) => {
    const targetDate = new Date(currentYear, currentMonth - offset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    return `${year}/${month}`;
  };

  return [
    { value: "1d", label: t("stats.range1d") },
    { value: "7d", label: t("stats.range7d") },
    { value: "30d", label: t("stats.range30d") },
    { value: "90d", label: t("stats.range90d") },
    { value: "m0", label: getMonthLabel(0) },
    { value: "m1", label: getMonthLabel(1) },
    { value: "m2", label: getMonthLabel(2) },
    { value: "m3", label: getMonthLabel(3) },
  ];
});

const getModeLabel = (mode) => {
  const key = `modes.${mode}`;
  const label = t(key);
  return label === key ? mode : label;
};

const formatDateKey = (value) => {
  if (!value) return "";
  return format(startOfLocalDay(value), "yyyy-MM-dd");
};

const parseDateKeyUtc = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateKeyLocal = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addUtcDays = (value, days) => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const normalizeDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDateLabel = (value, pattern = "MM/dd") => {
  const date = parseDateKeyLocal(value);
  return date ? format(date, pattern) : value || "";
};

const handleRangePresetChange = (value) => {
  rangePreset.value = value || "30d";
};

const requestPayload = computed(() => {
  return { preset: rangePreset.value };
});

const requestFingerprint = computed(() => {
  return JSON.stringify(requestPayload.value);
});

const displayedRange = computed(() => {
  if (stats.value?.range?.startDate && stats.value?.range?.endDate) {
    return stats.value.range;
  }

  if (requestPayload.value?.startDate && requestPayload.value?.endDate) {
    const startAt = parseDateKeyUtc(requestPayload.value.startDate);
    const endAt = parseDateKeyUtc(requestPayload.value.endDate);
    const days = startAt && endAt ? Math.floor((endAt.getTime() - startAt.getTime()) / 86400000) + 1 : 0;

    return {
      ...requestPayload.value,
      days,
    };
  }

  return null;
});

const rangeSummary = computed(() => {
  if (displayedRange.value?.startDate && displayedRange.value?.endDate) {
    return t("stats.rangeSummary", {
      start: formatDateLabel(displayedRange.value.startDate, "yyyy/MM/dd"),
      end: formatDateLabel(displayedRange.value.endDate, "yyyy/MM/dd"),
      days: displayedRange.value.days || 0,
    });
  }

  const selectedOption = rangeOptions.value.find((option) => option.value === rangePreset.value);
  return selectedOption?.label || "";
});

const timelineSeries = computed(() => {
  const range = stats.value?.range;
  if (!range?.startDate || !range?.endDate) {
    return [];
  }

  const startAt = parseDateKeyUtc(range.startDate);
  const days = Number(range.days || 0);
  if (!startAt || !days) {
    return [];
  }

  const lookup = new Map((stats.value?.timeline || []).map((point) => [normalizeDateKey(point.bucket), Number(point.visits || 0)]));
  const points = [];

  for (let index = 0; index < days; index += 1) {
    const date = addUtcDays(startAt, index);
    const key = date.toISOString().slice(0, 10);
    const visits = lookup.get(key) || 0;
    points.push({
      key,
      label: formatDateLabel(key, "MM/dd"),
      fullLabel: formatDateLabel(key, "yyyy/MM/dd"),
      visits,
    });
  }

  const maxVisits = Math.max(...points.map((point) => point.visits), 0);

  return points.map((point) => ({
    ...point,
    height: maxVisits > 0 ? Math.max((point.visits / maxVisits) * 100, point.visits > 0 ? 8 : 2) : 2,
  }));
});

const totalVisits = computed(() => Number(stats.value?.summary?.totalVisits || 0));
const totalVisitors = computed(() => Number(stats.value?.summary?.totalVisitors || 0));
const selectedDays = computed(() => Number(stats.value?.range?.days || timelineSeries.value.length || 0));

const averageDailyVisits = computed(() => {
  if (!totalVisits.value || !selectedDays.value) return 0;
  return Math.round((totalVisits.value / selectedDays.value) * 10) / 10;
});

const peakDay = computed(() => {
  return timelineSeries.value.reduce((best, point) => {
    if (!point.visits) return best;
    if (!best || point.visits > best.visits) return point;
    return best;
  }, null);
});

const summaryCards = computed(() => [
  {
    key: "totalVisits",
    label: t("stats.totalVisits"),
    value: formatter.format(totalVisits.value),
    meta: t("stats.visits"),
  },
  {
    key: "totalVisitors",
    label: t("stats.totalVisitors"),
    value: formatter.format(totalVisitors.value),
    meta: t("stats.visitors"),
  },
  {
    key: "dailyAverage",
    label: t("stats.dailyAverage"),
    value: averageDailyVisits.value ? decimalFormatter.format(averageDailyVisits.value) : "0",
    meta: t("stats.visits"),
  },
  {
    key: "peakDay",
    label: t("stats.peakDay"),
    value: peakDay.value ? peakDay.value.fullLabel : "-", // t("stats.peakDayEmpty"),
    meta: peakDay.value ? `${formatter.format(peakDay.value.visits)} ${t("stats.visits")}` : t("stats.timelineEmpty"),
  },
]);

const featuredBreakdownSections = computed(() => [
  {
    key: "referrers",
    title: t("stats.referrers"),
    subtitle: t("stats.sourceHealth"),
    accentClass: "from-emerald-500/12 via-teal-500/8 to-transparent",
    meterClass: "bg-[linear-gradient(90deg,#0f172a,#10b981)]",
    items: stats.value?.referrers || [],
  },
  {
    key: "ips",
    title: t("stats.ips"),
    subtitle: t("stats.ipDist"),
    accentClass: "from-cyan-500/12 via-teal-500/8 to-transparent",
    meterClass: "bg-[linear-gradient(90deg,#0f172a,#06b6d4)]",
    items: stats.value?.ips || [],
  },
  {
    key: "devices",
    title: t("stats.devices"),
    subtitle: t("stats.deviceMix"),
    accentClass: "from-slate-500/12 via-slate-400/8 to-transparent",
    meterClass: "bg-[linear-gradient(90deg,#0f172a,#475569)]",
    items: stats.value?.devices || [],
  },
  {
    key: "languages",
    title: t("stats.languages"),
    subtitle: t("stats.languageMix"),
    accentClass: "from-rose-500/12 via-pink-500/8 to-transparent",
    meterClass: "bg-[linear-gradient(90deg,#0f172a,#f43f5e)]",
    items: stats.value?.languages || [],
  },
]);

const getBreakdownTotal = (items = []) => items.reduce((sum, item) => sum + Number(item.visits || 0), 0);

const getBreakdownShare = (items, value) => {
  const total = getBreakdownTotal(items);
  if (!total) return 0;
  return Number(value || 0) / total;
};

const getBreakdownWidth = (items, value) => {
  const share = getBreakdownShare(items, value);
  if (!share) return "0%";
  return `${Math.max(share * 100, 8)}%`;
};

const getCountryCode = (value) => {
  const normalized = String(value || "").toUpperCase();
  if (/^[A-Z]{2}$/.test(normalized)) return normalized;
  return "";
};

const getCountryName = (value) => {
  const code = getCountryCode(value);
  if (!code) return value;

  try {
    return regionNames.value?.of(code) || code;
  } catch {
    return code;
  }
};

const getBreakdownLabel = (type, value) => {
  if (!value) {
    return t("stats.unknown");
  }

  if (type === "referrers" && value === "direct") {
    return t("stats.direct");
  }

  if (value === "unknown") {
    return t("stats.unknown");
  }

  if (type === "countries") {
    return getCountryName(value);
  }

  if (type === "devices") {
    const modeKey = `stats.deviceLabels.${value}`;
    const translated = t(modeKey);
    return translated === modeKey ? value : translated;
  }

  return value;
};

const formatShare = (value, precise = false) => {
  return precise ? precisePercentFormatter.format(value || 0) : percentFormatter.format(value || 0);
};

const hasTimelineData = computed(() => timelineSeries.value.some((point) => point.visits > 0));
const timelineMinWidth = computed(() => `${Math.max(timelineSeries.value.length * 10, 320)}px`);

const loadStats = async () => {
  if (!props.visible || !props.item?.slug || !requestPayload.value) return;

  const currentRequest = requestSequence.value + 1;
  requestSequence.value = currentRequest;
  loading.value = true;
  error.value = "";

  try {
    const response = await fetch(`/api/?action=stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: props.item.slug,
        ...requestPayload.value,
      }),
    });
    const result = await response.json();

    if (!response.ok || result.code !== 0) {
      throw new Error(result.msg || t("stats.failed"));
    }

    if (currentRequest !== requestSequence.value) {
      return;
    }

    stats.value = result.data;
  } catch (requestError) {
    if (currentRequest !== requestSequence.value) {
      return;
    }

    console.error("Failed to load analytics stats:", requestError);
    stats.value = null;
    error.value = requestError.message || t("stats.failed");
  } finally {
    if (currentRequest === requestSequence.value) {
      loading.value = false;
    }
  }
};

watch(
  () => [props.visible, props.item?.slug, requestFingerprint.value],
  ([visible, slug]) => {
    if (!visible || !slug) return;

    if (!requestPayload.value) {
      loading.value = false;
      error.value = "";
      return;
    }

    loadStats();
  },
  { immediate: true }
);
</script>

<template>
  <Dialog :open="visible" @update:open="closeDialog">
    <DialogContent class="w-[96%] max-w-7xl bg-white/70 shadow-lg backdrop-blur-sm !rounded-2xl">
      <DialogHeader class="space-y-3 text-left">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-2">
            <div class="space-y-1">
              <DialogTitle class="text-2xl tracking-tight text-slate-900">
                {{ title }}
                <span class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {{ getModeLabel(item?.mode) }}
                </span>
              </DialogTitle>
              <!-- <DialogDescription class="space-y-3">
                <p class="text-sm text-slate-500">{{ t("stats.description") }}</p>
                <p v-if="rangeValidationError" class="text-xs text-amber-700">
                  {{ rangeValidationError }}
                </p>
              </DialogDescription> -->
            </div>
          </div>

          <Button class="ml-auto h-6 w-6 p-0 !my-0" variant="ghost" size="icon" @click="closeDialog(false)">
            <i class="icon-[material-symbols--close] h-4 w-4" />
          </Button>
        </div>
      </DialogHeader>
      <div class="max-h-[80vh] overflow-y-auto space-y-3 p-2 -m-2">
        <div class="space-y-3">
          <div v-if="loading" class="flex min-h-[320px] items-center justify-center text-slate-500">
            <div class="flex items-center gap-2">
              <i class="icon-[material-symbols--progress-activity] animate-spin text-lg" />
              <span>{{ t("stats.loading") }}</span>
            </div>
          </div>

          <div v-else-if="error" class="py-[18%] text-center text-amber-700">
            {{ error }}
          </div>

          <div v-else-if="stats && stats.enabled === false" class="py-[18%] text-center text-slate-400">
            {{ t("stats.unavailable") }}
          </div>

          <template v-else>
            <div class="h-96 overflow-hidden rounded-lg">
              <WorldMap :countries="stats?.countries || []">
                <template #left-top>
                  <Select :model-value="rangePreset" @update:model-value="handleRangePresetChange">
                    <SelectTrigger class="border-none shadow-none">
                      <SelectValue :placeholder="t('stats.range')" />
                    </SelectTrigger>
                    <SelectContent class="rounded-md p-1">
                      <SelectItem v-for="option in rangeOptions" :key="option.value" :value="option.value"
                        class="cursor-pointer rounded-md">
                        {{ option.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </template>
              </WorldMap>
            </div>
            <div class="grid gap-3 grid-cols-2 lg:grid-cols-4 !-mt-12">
              <div v-for="card in summaryCards" :key="card.key"
                class="rounded-md border border-slate-200/50 bg-white/50 px-4 py-4 shadow-sm backdrop-blur-xl">
                <!-- <div class="text-xs uppercase tracking-[0.16em] text-slate-400">{{ card.label }}</div> -->
                <div class="break-words text-xl font-semibold tracking-tight text-slate-900">
                  {{ card.value }}
                </div>
                <div class="mt-2 text-sm text-slate-500">{{ card.label }}</div>
              </div>
            </div>

            <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              <section class="space-y-2 md:col-span-2">
                <div class="flex flex-col gap-1">
                  <h3 class="text-base font-semibold text-slate-900">{{ t("stats.trend") }}</h3>
                </div>

                <div v-if="hasTimelineData"
                  class="h-60 rounded-md border border-slate-200/80 bg-white/80 shadow-sm flex flex-col p-3">
                  <div class="flex h-full items-end gap-[1px]">
                    <div v-for="point in timelineSeries" :key="point.key"
                      class="group flex h-full flex-1 items-end hover:bg-slate-50"
                      :title="`${point.label}: ${formatter.format(point.visits)} ${t('stats.visits')}`">
                      <div class="w-full bg-black transition-opacity group-hover:opacity-50"
                        :style="{ height: `${point.height}%` }" />
                    </div>
                  </div>
                  <div class="mt-1 flex justify-between text-[11px] text-slate-400">
                    <span>{{ timelineSeries[0]?.label }}</span>
                    <span>{{ timelineSeries[Math.floor(timelineSeries.length / 2)]?.label }}</span>
                    <span>{{ timelineSeries[timelineSeries.length - 1]?.label }}</span>
                  </div>
                </div>

                <div v-else
                  class="flex h-60 items-center justify-center rounded-md border border-slate-200/80 bg-white/80 text-sm text-slate-500 shadow-sm">
                  {{ t("stats.timelineEmpty") }}
                </div>
              </section>
              <PieChart :data="stats?.browsers || []" :title="t('stats.browsers')" />
              <PieChart :data="stats?.oses || []" :title="t('stats.oses')" />
            </div>

            <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <section v-for="section in featuredBreakdownSections" :key="section.key"
                class="overflow-hidden rounded-md border border-slate-200/80 shadow-sm">
                <div class="relative px-4 pt-3">
                  <div class="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100"
                    :class="section.accentClass" />
                  <div class="relative flex items-start justify-between gap-4">
                    <h3 class="text-base font-semibold text-slate-900">{{ section.title }}</h3>
                  </div>
                </div>

                <div v-if="section.items.length" class="space-y-1 px-4 py-4">
                  <div v-for="entry in section.items" :key="`${section.key}-${entry.label}`" class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-3">
                      <div class="w-full min-w-0">
                        <span class="truncate text-sm font-medium text-slate-900">
                          {{ getBreakdownLabel(section.key, entry.label) }}
                        </span>

                        <div class="h-2 p-[1px] overflow-hidden bg-white">
                          <div class="h-full" :class="section.meterClass"
                            :style="{ width: getBreakdownWidth(section.items, entry.visits) }" />
                        </div>
                      </div>

                      <div class="shrink-0 text-right">
                        <div class="text-sm font-semibold text-slate-900">{{ formatter.format(entry.visits) }}
                        </div>
                        <div class="text-[11px] text-slate-400">
                          {{ formatShare(getBreakdownShare(section.items, entry.visits), true) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="px-4 py-8 text-center text-sm text-slate-500 sm:px-5">
                  {{ t("stats.noBreakdown") }}
                </div>
              </section>
            </div>
          </template>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
