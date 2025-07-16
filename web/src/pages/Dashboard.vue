<template>
  <div class="min-h-screen bg-background">
    <!-- 头部导航 -->
    <header class="border-b border-border bg-card">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <h1 class="text-2xl font-bold text-primary">Fig 管理面板</h1>
            <nav class="flex space-x-4">
              <router-link 
                to="/dashboard" 
                class="text-sm font-medium text-foreground hover:text-primary"
              >
                链接管理
              </router-link>
              <router-link 
                to="/navigation" 
                class="text-sm font-medium text-foreground hover:text-primary"
              >
                导航页
              </router-link>
            </nav>
          </div>
          <div class="flex items-center space-x-4">
            <Button @click="handleLogout" variant="outline" size="sm">
              退出登录
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="container mx-auto px-4 py-8">
      <div class="grid gap-6">
        <!-- 统计卡片 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card>
            <CardContent class="p-6 pt-8">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-muted-foreground">总连接数</p>
                  <p class="text-2xl font-bold">{{ stats.totalLinks }}</p>
                </div>
                <div class="text-primary">
                  📊
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent class="p-6 pt-8">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-muted-foreground">固定链接</p>
                  <p class="text-2xl font-bold">{{ stats.pinnedLinks }}</p>
                </div>
                <div class="text-primary">
                  📌
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent class="p-6 pt-8">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-muted-foreground">总访问次数</p>
                  <p class="text-2xl font-bold">{{ stats.totalClicks }}</p>
                </div>
                <div class="text-primary">
                  👆
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- 创建链接表单 -->
        <Card>
          <CardHeader>
            <CardTitle>创建新链接</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateLinkForm @created="handleLinkCreated" />
          </CardContent>
        </Card>

        <!-- 链接列表 -->
        <Card>
          <CardHeader>
            <CardTitle>链接管理</CardTitle>
          </CardHeader>
          <CardContent>
            <LinksTable />
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLinksStore } from '@/stores/links'
import Card from '@/components/ui/Card.vue'
import CardHeader from '@/components/ui/CardHeader.vue'
import CardContent from '@/components/ui/CardContent.vue'
import CardTitle from '@/components/ui/CardTitle.vue'
import Button from '@/components/ui/Button.vue'
import CreateLinkForm from '@/components/link/CreateLinkForm.vue'
import LinksTable from '@/components/link/LinksTable.vue'

const router = useRouter()
const authStore = useAuthStore()
const linksStore = useLinksStore()

const stats = ref({
  totalLinks: 0,
  pinnedLinks: 0,
  totalClicks: 0
})

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}

const handleLinkCreated = () => {
  linksStore.fetchLinks()
  updateStats()
}

const updateStats = async () => {
  // 更新统计信息
  if (linksStore.links && linksStore.links.length > 0) {
    stats.value.totalLinks = linksStore.links.length
    stats.value.pinnedLinks = linksStore.links.filter(link => link.is_pinned).length
    stats.value.totalClicks = linksStore.links.reduce((total, link) => total + (link.clicks || 0), 0)
  } else {
    stats.value.totalLinks = 0
    stats.value.pinnedLinks = 0
    stats.value.totalClicks = 0
  }
}

onMounted(async () => {
  await linksStore.fetchLinks()
  updateStats()
})
</script>