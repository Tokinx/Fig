<script setup>
import { computed, ref, watch } from "vue";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "vue-i18n";

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

const formatter = new Intl.NumberFormat();
const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: "compact",
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

const shortUrl = computed(() => {
  if (!props.item?.slug) return "";
  return `${location.origin}/${props.item.slug}`;
});

const title = computed(() => props.item?.displayName || props.item?.slug || t("stats.analytics"));

const regionNames = computed(() => {
  if (typeof Intl.DisplayNames !== "function") return null;
  return new Intl.DisplayNames([locale.value, "en"], { type: "region" });
});

const getModeLabel = (mode) => {
  const key = `modes.${mode}`;
  const label = t(key);
  return label === key ? mode : label;
};

const normalizeDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const timelineSeries = computed(() => {
  const lookup = new Map((stats.value?.timeline || []).map((point) => [normalizeDateKey(point.bucket), Number(point.visits || 0)]));
  const points = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let index = 89; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - index);

    const key = date.toISOString().slice(0, 10);
    const visits = lookup.get(key) || 0;
    points.push({
      key,
      label: format(date, "MM/dd"),
      visits,
    });
  }

  const maxVisits = Math.max(...points.map((point) => point.visits), 0);

  return points.map((point) => ({
    ...point,
    height: maxVisits > 0 ? Math.max((point.visits / maxVisits) * 100, point.visits > 0 ? 6 : 2) : 2,
  }));
});

const totalVisits90d = computed(() => Number(stats.value?.summary?.last90d || 0));

const summaryCards = computed(() => [
  { key: "last24h", label: t("stats.last24h"), value: stats.value?.summary?.last24h || 0 },
  { key: "last7d", label: t("stats.last7d"), value: stats.value?.summary?.last7d || 0 },
  { key: "last30d", label: t("stats.last30d"), value: stats.value?.summary?.last30d || 0 },
  { key: "last90d", label: t("stats.last90d"), value: stats.value?.summary?.last90d || 0 },
]);

const averageDailyVisits = computed(() => {
  if (!totalVisits90d.value) return 0;
  return Math.round((totalVisits90d.value / 90) * 10) / 10;
});

const peakDay = computed(() => {
  return timelineSeries.value.reduce((best, point) => {
    if (!point.visits) return best;
    if (!best || point.visits > best.visits) return point;
    return best;
  }, null);
});

const featuredBreakdownSections = computed(() => [
  {
    key: "countries",
    title: t("stats.countries"),
    subtitle: t("stats.geoReach"),
    accentClass: "from-sky-500/12 via-cyan-500/8 to-transparent",
    heroSurfaceClass: "border-sky-200/70 bg-[linear-gradient(145deg,rgba(240,249,255,0.96),rgba(224,242,254,0.88))]",
    meterClass: "bg-[linear-gradient(90deg,#0f172a,#0ea5e9)]",
    items: stats.value?.countries || [],
  },
  {
    key: "referrers",
    title: t("stats.referrers"),
    subtitle: t("stats.sourceHealth"),
    accentClass: "from-emerald-500/12 via-teal-500/8 to-transparent",
    heroSurfaceClass: "border-emerald-200/70 bg-[linear-gradient(145deg,rgba(236,253,245,0.96),rgba(209,250,229,0.88))]",
    meterClass: "bg-[linear-gradient(90deg,#0f172a,#10b981)]",
    items: stats.value?.referrers || [],
  },
  {
    key: "devices",
    title: t("stats.devices"),
    subtitle: t("stats.deviceMix"),
    accentClass: "from-slate-500/12 via-slate-400/8 to-transparent",
    heroSurfaceClass: "border-slate-200/70 bg-[linear-gradient(145deg,rgba(248,250,252,0.96),rgba(226,232,240,0.88))]",
    meterClass: "bg-[linear-gradient(90deg,#0f172a,#475569)]",
    items: stats.value?.devices || [],
  },
]);

const getBreakdownTotal = (items = []) => items.reduce((sum, item) => sum + Number(item.visits || 0), 0);

const getBreakdownShare = (items, value) => {
  const total = getBreakdownTotal(items);
  if (!total) return 0;
  return Number(value || 0) / total;
};

const getBreakdownCoverage = (items) => {
  if (!totalVisits90d.value) return 0;
  return getBreakdownTotal(items) / totalVisits90d.value;
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

const getReferrerBadge = (value) => {
  if (!value || value === "direct" || value === "unknown") {
    return "IN";
  }

  const host = String(value).replace(/^www\./, "");
  const segment = host.split(".")[0] || host;
  return segment.slice(0, 2).toUpperCase();
};

const getDeviceBadge = (value) => {
  if (value === "mobile") return "MB";
  if (value === "tablet") return "TB";
  if (value === "bot") return "BOT";
  if (value === "desktop") return "PC";
  return "--";
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

  const modeKey = `stats.deviceLabels.${value}`;
  if (type === "devices") {
    const translated = t(modeKey);
    return translated === modeKey ? value : translated;
  }

  return value;
};

const getBreakdownBadge = (type, value) => {
  if (type === "countries") {
    return getCountryCode(value) || "--";
  }

  if (type === "referrers") {
    return getReferrerBadge(value);
  }

  return "--";
};

const formatShare = (value, precise = false) => {
  return precise ? precisePercentFormatter.format(value || 0) : percentFormatter.format(value || 0);
};

const loadStats = async () => {
  if (!props.visible || !props.item?.slug) return;

  loading.value = true;
  error.value = "";

  try {
    const response = await fetch(`/api/?action=stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: props.item.slug }),
    });
    const result = await response.json();

    if (!response.ok || result.code !== 0) {
      throw new Error(result.msg || t("stats.failed"));
    }

    stats.value = result.data;
  } catch (requestError) {
    console.error("Failed to load analytics stats:", requestError);
    stats.value = null;
    error.value = requestError.message || t("stats.failed");
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.visible, props.item?.slug],
  ([visible, slug]) => {
    if (visible && slug) {
      loadStats();
    }
  },
  { immediate: true }
);
</script>

<template>
  <Dialog :open="visible" @update:open="closeDialog">
    <DialogContent class="w-[96%] max-w-6xl max-h-[90vh] overflow-y-auto shadow-lg !rounded-2xl bg-white/60">
      <DialogHeader class="space-y-3 text-left">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-2">
            <div class="space-y-1">
              <DialogTitle class="text-2xl tracking-tight text-slate-900">{{ title }}</DialogTitle>
              <DialogDescription>
                <div class="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                  <span class="rounded bg-slate-100 px-2 py-0.5">{{ getModeLabel(item?.mode) }}</span>
                  <span class="rounded bg-slate-100 px-2 py-0.5">{{ shortUrl }}</span>
                </div>
              </DialogDescription>
            </div>
          </div>

          <!-- <Button type="button" variant="ghost" size="icon" class="rounded-full" @click="closeDialog(false)">
            <i class="icon-[material-symbols--close-rounded] h-5 w-5" />
            <span class="sr-only">{{ t("common.close") }}</span>
          </Button> -->
          <Button class="w-6 h-6 p-0 !my-0 ml-auto" variant="ghost" size="icon" @click="closeDialog(false)">
            <i class="icon-[material-symbols--close] h-4 w-4" />
          </Button>
        </div>
      </DialogHeader>


      <div class="max-h-[60vh] space-y-6 overflow-y-auto">
        <div v-if="loading" class="flex min-h-[320px] items-center justify-center text-slate-500">
          <div class="flex items-center gap-2">
            <i class="icon-[material-symbols--progress-activity] animate-spin text-lg" />
            <span>{{ t("stats.loading") }}</span>
          </div>
        </div>

        <div v-else-if="error" class="py-[20%] text-center text-amber-700">
          {{ error }}
        </div>

        <div v-else-if="stats && stats.enabled === false" class="py-[20%] text-center text-slate-400">
          {{ t("stats.unavailable") }}
        </div>

        <template v-else>
          <div class="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div v-for="card in summaryCards" :key="card.key" class="rounded-md border px-4 py-3 shadow-sm">
              <div class="text-xs uppercase text-slate-400">{{ card.label }}</div>
              <div class="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                {{ formatter.format(card.value) }}
              </div>
              <div class="mt-2 text-xs text-slate-500">{{ t("stats.visits") }}</div>
            </div>
          </div>

          <section>
            <div class="flex flex-col gap-2">
              <div>
                <h3 class="text-base font-semibold text-slate-900">{{ t("stats.trend90d") }}</h3>
                <!-- <p class="text-sm text-slate-500">{{ t("stats.rankedByVisits") }}</p> -->
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div class="grid gap-3 sm:grid-rows-2">
                  <div class="rounded-md border px-4 py-3">
                    <div class="text-xs uppercase text-slate-400">{{ t("stats.dailyAverage") }}
                    </div>
                    <div class="mt-2 text-xl font-semibold text-slate-900">
                      {{ averageDailyVisits ? compactFormatter.format(averageDailyVisits) : 0 }}
                    </div>
                    <div class="text-sm text-slate-500">{{ t("stats.visits") }}</div>
                  </div>

                  <div class="rounded-md border px-4 py-3">
                    <div class="text-xs uppercase text-slate-400">{{ t("stats.peakDay") }}</div>
                    <div class="mt-2 text-xl font-semibold text-slate-900">
                      {{ peakDay ? peakDay.label : t("stats.peakDayEmpty") }}
                    </div>
                    <div class="text-sm text-slate-500">
                      {{ peakDay ? `${formatter.format(peakDay.visits)} ${t("stats.visits")}` :
                        t("stats.timelineEmpty") }}
                    </div>
                  </div>
                </div>

                <div v-if="stats?.summary?.last90d" class="rounded-md border px-4 py-3 sm:col-span-2">
                  <div class="flex h-40 items-end gap-[1px]">
                    <div v-for="point in timelineSeries" :key="point.key" class="group flex h-full flex-1 items-end"
                      :title="`${point.label}: ${formatter.format(point.visits)} ${t('stats.visits')}`">
                      <div class="w-full bg-black transition-opacity group-hover:opacity-50"
                        :style="{ height: `${point.height}%` }" />
                    </div>
                  </div>
                  <div class="mt-3 flex justify-between text-[11px] text-slate-400">
                    <span>{{ timelineSeries[0]?.label }}</span>
                    <span>{{ timelineSeries[Math.floor(timelineSeries.length / 2)]?.label }}</span>
                    <span>{{ timelineSeries[timelineSeries.length - 1]?.label }}</span>
                  </div>
                </div>
                <div v-else
                  class="rounded-md border text-slate-500 flex items-center justify-center text-sm sm:col-span-2">
                  {{ t("stats.timelineEmpty") }}
                </div>
              </div>
            </div>
          </section>

          <div class="grid gap-3 md:grid-cols-3">
            <section v-for="section in featuredBreakdownSections" :key="section.key"
              class="overflow-hidden rounded-md border shadow-sm">
              <div class="relative border-b px-4 py-3">
                <div class="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100"
                  :class="section.accentClass" />
                <div class="relative flex items-start justify-between gap-4">
                  <h3 class="text-base font-semibold text-slate-900">{{ section.title }}</h3>
                  <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase text-slate-500">
                    {{ section.subtitle }}
                  </span>
                </div>
              </div>

              <div v-if="section.items.length" class="space-y-1 px-4 py-4 sm:px-5">
                <div v-for="entry in section.items" :key="`${section.key}-${entry.label}`" class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-3">
                    <div class="w-full min-w-0">
                      <span class="truncate text-sm font-medium text-slate-900">
                        {{ getBreakdownLabel(section.key, entry.label) }}
                      </span>

                      <div class="h-2 overflow-hidden bg-white">
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
    </DialogContent>
  </Dialog>
</template>
