<template>
  <div class="min-h-screen bg-background">
    <!-- 导航页头部 -->
    <header class="border-b border-border bg-card">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-primary">{{ config.title }}</h1>
            <p class="text-sm text-muted-foreground">{{ config.description }}</p>
          </div>
          <div class="flex items-center space-x-4">
            <Button 
              v-if="authStore.isAuthenticated" 
              @click="toggleEditMode"
              variant="outline"
              size="sm"
            >
              {{ isEditMode ? '完成编辑' : '编辑模式' }}
            </Button>
            <router-link 
              to="/dashboard" 
              class="text-sm text-primary hover:underline"
            >
              管理面板
            </router-link>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="container mx-auto px-4 py-8">
      <div v-if="loading" class="text-center py-8">
        <div class="text-lg text-muted-foreground">加载中...</div>
      </div>
      
      <div v-else-if="error" class="text-center py-8">
        <div class="text-lg text-destructive">{{ error }}</div>
      </div>
      
      <div v-else-if="sortedPinnedLinks.length === 0" class="text-center py-16">
        <div class="text-lg text-muted-foreground mb-4">暂无固定链接</div>
        <router-link 
          to="/dashboard" 
          class="text-primary hover:underline"
        >
          去管理面板创建链接
        </router-link>
      </div>
      
      <div v-else class="grid gap-6">
        <!-- 固定链接网格 -->
        <div 
          ref="sortableContainer"
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          <NavigationCard
            v-for="link in sortedPinnedLinks"
            :key="link.key"
            :link="link"
            :is-edit-mode="isEditMode"
            @unpin="handleUnpin"
            @edit="handleEdit"
          />
        </div>
      </div>
    </main>

    <!-- 底部 -->
    <footer class="mt-16 border-t border-border bg-card">
      <div class="container mx-auto px-4 py-6 text-center">
        <p class="text-sm text-muted-foreground">
          Powered by <span class="font-semibold text-primary">Fig</span>
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNavigationStore } from '@/stores/navigation'
import { useLinksStore } from '@/stores/links'
import Button from '@/components/ui/Button.vue'
import NavigationCard from '@/components/navigation/NavigationCard.vue'
import Sortable from 'sortablejs'

const authStore = useAuthStore()
const navigationStore = useNavigationStore()
const linksStore = useLinksStore()

const sortableContainer = ref(null)
let sortableInstance = null

const config = computed(() => navigationStore.config)
const sortedPinnedLinks = computed(() => navigationStore.sortedPinnedLinks)
const loading = computed(() => navigationStore.loading)
const error = computed(() => navigationStore.error)
const isEditMode = computed(() => navigationStore.isEditMode)

const toggleEditMode = async () => {
  navigationStore.toggleEditMode()
  
  if (isEditMode.value) {
    await nextTick()
    initSortable()
  } else {
    destroySortable()
  }
}

const initSortable = () => {
  if (sortableContainer.value && !sortableInstance) {
    sortableInstance = new Sortable(sortableContainer.value, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      handle: '.drag-handle',
      onEnd: handleSortEnd
    })
  }
}

const destroySortable = () => {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
}

const handleSortEnd = async (evt) => {
  if (evt.oldIndex === evt.newIndex) {
    return
  }
  
  // 创建新的排序数据
  const newOrder = sortedPinnedLinks.value.map((link, index) => ({
    key: link.key,
    order: index
  }))
  
  // 更新服务器端排序
  await navigationStore.updatePinnedOrder(newOrder)
}

const handleUnpin = async (key) => {
  await linksStore.unpinLink(key)
  await navigationStore.fetchPinnedLinks()
}

const handleEdit = (link) => {
  // 编辑链接功能
  console.log('编辑链接:', link)
}

onMounted(async () => {
  authStore.checkAuth()
  await navigationStore.fetchPinnedLinks()
})

// 清理 Sortable 实例
import { onUnmounted } from 'vue'
onUnmounted(() => {
  destroySortable()
})
</script>

<style scoped>
.sortable-ghost {
  opacity: 0.5;
}

.sortable-chosen {
  transform: scale(1.02);
}

.sortable-drag {
  opacity: 0.8;
}
</style>