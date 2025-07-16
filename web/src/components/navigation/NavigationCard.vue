<template>
  <div 
    class="navigation-card group"
    :style="cardStyle"
    @click="handleCardClick"
  >
    <!-- 拖拽手柄 -->
    <div 
      v-if="isEditMode"
      class="drag-handle absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
    >
      ⋮⋮
    </div>

    <!-- 卡片内容 -->
    <div class="flex items-start space-x-4">
      <!-- 图标 -->
      <div class="flex-shrink-0">
        <div 
          class="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
          :style="iconStyle"
        >
          {{ link.pinned_icon || '🔗' }}
        </div>
      </div>

      <!-- 内容 -->
      <div class="flex-1 min-w-0">
        <h3 class="font-medium text-foreground truncate">
          {{ link.title || link.url }}
        </h3>
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">
          {{ link.description || link.url }}
        </p>
        
        <!-- 统计信息 -->
        <div class="flex items-center space-x-4 mt-3 text-xs text-muted-foreground">
          <span>👆 {{ link.clicks || 0 }} 次访问</span>
          <span>{{ getModeText(link.mode) }}</span>
        </div>
      </div>
    </div>

    <!-- 编辑模式下的操作按钮 -->
    <div v-if="isEditMode" class="mt-4 flex justify-end space-x-2">
      <Button
        @click.stop="$emit('edit', link)"
        variant="outline"
        size="sm"
      >
        编辑
      </Button>
      <Button
        @click.stop="$emit('unpin', link.key)"
        variant="outline"
        size="sm"
        class="text-destructive hover:bg-destructive/10"
      >
        取消固定
      </Button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Button from '@/components/ui/Button.vue'

const props = defineProps({
  link: {
    type: Object,
    required: true
  },
  isEditMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['unpin', 'edit'])

const cardStyle = computed(() => ({
  backgroundColor: props.link.pinned_color || 'transparent'
}))

const iconStyle = computed(() => ({
  backgroundColor: props.link.pinned_color || 'hsl(var(--muted))',
  color: 'hsl(var(--muted-foreground))'
}))

const getModeText = (mode) => {
  const texts = {
    redirect: '直接跳转',
    remind: '提醒页面',
    cloaking: '隐藏模式',
    proxy: '代理模式'
  }
  return texts[mode] || mode
}

const handleCardClick = () => {
  if (!props.isEditMode) {
    // 访问链接
    window.open(`/${props.link.key}`, '_blank')
  }
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.drag-handle {
  font-size: 16px;
  color: hsl(var(--muted-foreground));
  writing-mode: vertical-lr;
  letter-spacing: -4px;
}
</style>