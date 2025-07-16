<template>
  <div class="min-h-screen bg-background flex items-center justify-center">
    <div class="max-w-md w-full mx-auto">
      <Card>
        <CardContent class="p-8 text-center">
          <div class="text-4xl mb-4">🔗</div>
          <h1 class="text-xl font-semibold mb-4">访问链接</h1>
          <p class="text-muted-foreground mb-6">
            正在处理您的请求...
          </p>
          
          <div v-if="loading" class="text-center">
            <div class="text-sm text-muted-foreground">加载中...</div>
          </div>
          
          <div v-else-if="error" class="text-center">
            <div class="text-sm text-destructive mb-4">{{ error }}</div>
            <Button @click="goHome" variant="outline">
              返回首页
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { linksService } from '@/services/links'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import Button from '@/components/ui/Button.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')

const goHome = () => {
  router.push('/')
}

const processLink = async () => {
  const key = route.params.key
  
  try {
    const response = await linksService.getLinkByKey(key)
    
    if (response.success) {
      const link = response.data
      
      // 根据访问模式处理链接
      switch (link.mode) {
        case 'redirect':
          window.location.href = link.url
          break
        case 'remind':
          // 显示提醒页面
          // TODO: 实现提醒页面
          break
        case 'cloaking':
          // 隐藏模式
          // TODO: 实现隐藏模式
          break
        case 'proxy':
          // 代理模式
          // TODO: 实现代理模式
          break
        default:
          window.location.href = link.url
      }
    } else {
      error.value = response.error?.message || '链接不存在'
    }
  } catch (err) {
    error.value = err.message || '访问链接时发生错误'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  processLink()
})
</script>