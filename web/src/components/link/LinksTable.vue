<template>
  <div class="space-y-4">
    <!-- 表格 -->
    <div class="border rounded-lg overflow-hidden">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-medium">短链接</th>
            <th class="px-4 py-3 text-left text-sm font-medium">目标URL</th>
            <th class="px-4 py-3 text-left text-sm font-medium">访问模式</th>
            <th class="px-4 py-3 text-left text-sm font-medium">访问次数</th>
            <th class="px-4 py-3 text-left text-sm font-medium">状态</th>
            <th class="px-4 py-3 text-left text-sm font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading" class="border-t">
            <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
              加载中...
            </td>
          </tr>
          <tr v-else-if="error" class="border-t">
            <td colspan="6" class="px-4 py-8 text-center text-destructive">
              {{ error }}
            </td>
          </tr>
          <tr v-else-if="links.length === 0" class="border-t">
            <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
              暂无链接
            </td>
          </tr>
          <tr v-else v-for="link in links" :key="link.key || link.id" class="border-t hover:bg-muted/50">
            <td class="px-4 py-3">
              <div class="flex items-center space-x-2">
                <code class="text-sm font-mono bg-muted px-2 py-1 rounded">{{ link.key || '无key' }}</code>
                <Button
                  @click="copyShortUrl(link.key)"
                  variant="ghost"
                  size="icon"
                  class="h-6 w-6"
                  :disabled="!link.key"
                >
                  📋
                </Button>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="max-w-xs truncate">
                <a :href="link.url" target="_blank" class="text-primary hover:underline">
                  {{ link.url }}
                </a>
              </div>
              <div v-if="link.title" class="text-sm text-muted-foreground">
                {{ link.title }}
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                :class="getModeClass(link.mode)">
                {{ getModeText(link.mode) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="font-medium">{{ link.clicks || 0 }}</span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center space-x-2">
                <Button
                  @click="togglePin(link)"
                  :variant="link.is_pinned ? 'default' : 'outline'"
                  size="sm"
                  class="h-6 text-xs"
                >
                  {{ link.is_pinned ? '📌 已固定' : '📌 固定' }}
                </Button>
                <span v-if="isExpired(link)" class="text-xs text-destructive">
                  已过期
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center space-x-2">
                <Button
                  @click="editLink(link)"
                  variant="ghost"
                  size="sm"
                  class="h-8 w-8 p-0"
                  :disabled="!link.key"
                >
                  ✏️
                </Button>
                <Button
                  @click="deleteLink(link.key)"
                  variant="ghost"
                  size="sm"
                  class="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  :disabled="!link.key"
                >
                  🗑️
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <div class="text-sm text-muted-foreground">
        共 {{ pagination.total }} 条记录，第 {{ pagination.page }} / {{ totalPages }} 页
      </div>
      <div class="flex items-center space-x-2">
        <Button
          @click="goToPage(pagination.page - 1)"
          :disabled="!hasPrevPage"
          variant="outline"
          size="sm"
        >
          上一页
        </Button>
        <Button
          @click="goToPage(pagination.page + 1)"
          :disabled="!hasNextPage"
          variant="outline"
          size="sm"
        >
          下一页
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useLinksStore } from '@/stores/links'
import { copyToClipboard } from '@/utils'
import Button from '@/components/ui/Button.vue'

const linksStore = useLinksStore()

const links = computed(() => linksStore.links)
const loading = computed(() => linksStore.loading)
const error = computed(() => linksStore.error)
const pagination = computed(() => linksStore.pagination)
const totalPages = computed(() => linksStore.totalPages)
const hasNextPage = computed(() => linksStore.hasNextPage)
const hasPrevPage = computed(() => linksStore.hasPrevPage)

const getModeClass = (mode) => {
  const classes = {
    redirect: 'bg-blue-100 text-blue-800',
    remind: 'bg-yellow-100 text-yellow-800',
    cloaking: 'bg-purple-100 text-purple-800',
    proxy: 'bg-green-100 text-green-800'
  }
  return classes[mode] || 'bg-gray-100 text-gray-800'
}

const getModeText = (mode) => {
  const texts = {
    redirect: '直接跳转',
    remind: '提醒页面',
    cloaking: '隐藏模式',
    proxy: '代理模式'
  }
  return texts[mode] || mode
}

const isExpired = (link) => {
  if (!link.expires_at) return false
  return Date.now() / 1000 > link.expires_at
}

const copyShortUrl = async (key) => {
  const shortUrl = `${window.location.origin}/${key}`
  try {
    await copyToClipboard(shortUrl)
    // TODO: 显示复制成功提示
    console.log('复制成功')
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const togglePin = async (link) => {
  if (link.is_pinned) {
    await linksStore.unpinLink(link.key)
  } else {
    await linksStore.pinLink(link.key)
  }
}

const editLink = (link) => {
  // TODO: 实现编辑链接功能
  console.log('编辑链接:', link)
}

const deleteLink = async (key) => {
  if (!key || key === 'undefined') {
    console.error('无效的链接key:', key)
    return
  }
  if (confirm('确定要删除这个链接吗？')) {
    await linksStore.deleteLink(key)
  }
}

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    linksStore.fetchLinks(page)
  }
}

onMounted(() => {
  if (links.value.length === 0) {
    linksStore.fetchLinks()
  }
})
</script>