<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import worldMapRaw from "@/assets/world-map-new.svg?raw";
import { useI18n } from "vue-i18n";

const props = defineProps({
  countries: {
    type: Array,
    default: () => [],
  },
});

const { t, locale } = useI18n();
const mapContainer = ref(null);
const mapContent = ref(null);
const scale = ref(1);
const position = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const hoveredCountry = ref(null);
const hoveredPosition = ref({ x: 0, y: 0 });
const isInitialized = ref(false);

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

const maxVisits = computed(() => Math.max(...props.countries.map((c) => Number(c.visits || 0)), 0));

const countryMap = computed(() => {
  const map = {};
  for (const c of props.countries) {
    if (c.label) map[c.label.toUpperCase()] = { visits: Number(c.visits || 0), label: c.label };
  }
  return map;
});

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

const svgContent = computed(() => {
  if (!maxVisits.value) return worldMapRaw;

  return worldMapRaw.replace(/<path([^>]*?)id="([A-Z]{2})"([^>]*?)>/g, (match, before, code, after) => {
    const data = countryMap.value[code];
    if (!data || !data.visits) return match;

    const intensity = Math.max(0.15, data.visits / maxVisits.value);
    const opacity = (0.2 + intensity * 0.8).toFixed(2);
    const fill = `fill="rgba(2,132,199,${opacity})"`;
    const style = `style="cursor:pointer;transition:fill 0.2s"`;
    const dataAttr = `data-visits="${data.visits}"`;

    let result = match;
    if (/fill="[^"]*"/.test(result)) {
      result = result.replace(/fill="[^"]*"/, fill);
    } else {
      result = result.replace(/>$/, ` ${fill}>`);
    }

    if (!/style=/.test(result)) {
      result = result.replace(/>$/, ` ${style}>`);
    }

    if (!/data-visits=/.test(result)) {
      result = result.replace(/>$/, ` ${dataAttr}>`);
    }

    return result;
  });
});

const handleZoomIn = () => {
  scale.value = Math.min(scale.value * 1.3, MAX_SCALE);
};

const handleZoomOut = () => {
  scale.value = Math.max(scale.value / 1.3, MIN_SCALE);
};

const handleWheel = (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value * delta));

  if (newScale !== scale.value) {
    const rect = mapContainer.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleRatio = newScale / scale.value;
    position.value.x = mouseX - (mouseX - position.value.x) * scaleRatio;
    position.value.y = mouseY - (mouseY - position.value.y) * scaleRatio;

    scale.value = newScale;
  }
};

const handleMouseDown = (e) => {
  if (e.target.tagName === "path" && e.target.dataset.visits) return;

  isDragging.value = true;
  dragStart.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y,
  };
  e.preventDefault();
};

const handleMouseMove = (e) => {
  const target = e.target;

  if (isDragging.value) {
    position.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y,
    };
    hoveredCountry.value = null;
  } else if (target.tagName === "path" && target.id && /^[A-Z]{2}$/.test(target.id)) {
    const code = target.id;
    const visits = target.dataset.visits;

    if (visits && Number(visits) >= 1) {
      hoveredCountry.value = {
        code,
        name: getCountryName(code),
        visits: Number(visits),
      };
      hoveredPosition.value = { x: e.clientX, y: e.clientY };
    } else {
      hoveredCountry.value = null;
    }
  } else {
    hoveredCountry.value = null;
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
};

const handleMouseLeave = () => {
  isDragging.value = false;
  hoveredCountry.value = null;
};

const centerMap = () => {
  if (!mapContainer.value || !mapContent.value) return;

  const container = mapContainer.value;
  const svg = mapContent.value.querySelector("svg");
  if (!svg) return;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const svgWidth = svg.clientWidth || 1000;
  const svgHeight = svg.clientHeight || 500;

  position.value = {
    x: (containerWidth - svgWidth) / 2,
    y: (containerHeight - svgHeight) / 2,
  };

  isInitialized.value = true;
};

onMounted(() => {
  if (mapContainer.value) {
    mapContainer.value.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // 等待 SVG 渲染后居中
    setTimeout(centerMap, 100);
  }
});

onUnmounted(() => {
  if (mapContainer.value) {
    mapContainer.value.removeEventListener("wheel", handleWheel);
  }
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
});
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-slate-50/50">
    <!-- 左侧国家列表 -->
    <div class="absolute left-3 top-3 z-10 w-60 rounded-md bg-white/50 shadow-sm backdrop-blur-lg">
      <div class="border-b border-slate-200/80 mx-3">
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

    <!-- 缩放控制 -->
    <div class="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-md bg-white/50 backdrop-blur-lg">
      <button
        @click="handleZoomIn"
        class="flex h-6 w-6 items-center justify-center rounded hover:bg-white transition-colors"
        :title="t('stats.zoomIn')"
      >
        <i class="icon-[material-symbols--add] text-lg text-slate-700" />
      </button>
      <button
        @click="handleZoomOut"
        class="flex h-6 w-6 items-center justify-center rounded hover:bg-white transition-colors"
        :title="t('stats.zoomOut')"
      >
        <i class="icon-[material-symbols--remove] text-lg text-slate-700" />
      </button>
    </div>

    <!-- 地图容器 -->
    <div
      ref="mapContainer"
      class="map-container h-full w-full overflow-hidden"
      :style="{ cursor: isDragging ? 'grabbing' : (hoveredCountry ? 'pointer' : 'grab') }"
      @mousedown="handleMouseDown"
      @mouseleave="handleMouseLeave"
    >
      <div
        ref="mapContent"
        class="origin-center transition-transform duration-100"
        :style="{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }"
        v-html="svgContent"
      />
    </div>

    <!-- 悬停提示 -->
    <Teleport to="body">
      <div
        v-if="hoveredCountry && !isDragging"
        class="pointer-events-none fixed z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xl"
        :style="{
          left: `${hoveredPosition.x + 12}px`,
          top: `${hoveredPosition.y + 12}px`,
        }"
      >
        <div class="text-sm font-semibold text-slate-900">{{ hoveredCountry.name }}</div>
        <div class="mt-0.5 text-xs text-slate-600">
          {{ formatter.format(hoveredCountry.visits) }} {{ t("stats.visits") }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
:deep(.map-container svg) {
  width: 100%;
  height: auto;
  min-width: 1000px;
  display: block;
}
:deep(.map-container path) {
  fill: #cbd5e1;
  fill-opacity: 0.46;
  stroke: #94a3b8;
  stroke-opacity: 0.28;
  stroke-width: 0.5;
}
:deep(.map-container path:hover) {
  stroke: #0284c7;
  stroke-width: 1;
  stroke-opacity: 0.8;
}
</style>
