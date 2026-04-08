<script setup>
import { computed } from "vue";

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  title: {
    type: String,
    default: "",
  },
  colors: {
    type: Array,
    default: () => ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899"],
  },
});

const total = computed(() => props.data.reduce((sum, item) => sum + Number(item.visits || 0), 0));

const segments = computed(() => {
  if (!total.value) return [];

  let currentAngle = -90; // 从顶部开始
  return props.data.map((item, index) => {
    const visits = Number(item.visits || 0);
    const percentage = (visits / total.value) * 100;
    const angle = (visits / total.value) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    currentAngle = endAngle;

    // 如果是100%或接近100%，使用圆形
    if (angle >= 359.9) {
      return {
        label: item.label,
        visits,
        percentage,
        color: props.colors[index % props.colors.length],
        path: null,
        isCircle: true,
      };
    }

    // 计算 SVG 路径
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = 50 + 45 * Math.cos(startRad);
    const y1 = 50 + 45 * Math.sin(startRad);
    const x2 = 50 + 45 * Math.cos(endRad);
    const y2 = 50 + 45 * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;

    return {
      label: item.label,
      visits,
      percentage,
      color: props.colors[index % props.colors.length],
      path: `M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`,
      isCircle: false,
    };
  });
});

const formatter = new Intl.NumberFormat();
const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-col gap-1">
      <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
    </div>

    <div class="h-60 flex items-center justify-center rounded-md border border-slate-200/80 bg-white/80 shadow-xs p-4">
      <div v-if="segments.length === 0" class="text-sm text-slate-500">
        暂无数据
      </div>
      <div v-else class="w-full flex items-center justify-center gap-3">
        <!-- 饼图 -->
        <svg viewBox="0 0 100 100" class="max-h-48 max-w-48">
          <g v-for="(segment, index) in segments" :key="index">
            <circle
              v-if="segment.isCircle"
              cx="50"
              cy="50"
              r="45"
              :fill="segment.color"
              :stroke="segment.color"
              stroke-width="0.5"
              class="transition-opacity hover:opacity-80"
            >
              <title>{{ segment.label }}: {{ formatter.format(segment.visits) }} ({{ percentFormatter.format(segment.percentage / 100) }})</title>
            </circle>
            <path
              v-else
              :d="segment.path"
              :fill="segment.color"
              :stroke="segment.color"
              stroke-width="0.5"
              class="transition-opacity hover:opacity-80"
            >
              <title>{{ segment.label }}: {{ formatter.format(segment.visits) }} ({{ percentFormatter.format(segment.percentage / 100) }})</title>
            </path>
          </g>
        </svg>

        <!-- 图例 -->
        <div class="flex-1 space-y-2 max-w-48">
          <div v-for="(segment, index) in segments" :key="index" class="flex items-center gap-3">
            <div class="h-3 w-3 shrink-0 rounded-sm" :style="{ backgroundColor: segment.color }" />
            <div class="min-w-0 flex-1">
              <div class="whitespace-nowrap truncate text-sm text-slate-700">
                {{ segment.label }}
              </div>
              <div class="whitespace-nowrap text-xs text-slate-500">
                {{ formatter.format(segment.visits) }} · {{ percentFormatter.format(segment.percentage / 100) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
