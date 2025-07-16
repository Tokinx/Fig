<template>
  <div class="min-h-screen bg-background flex items-center justify-center">
    <div class="max-w-md w-full mx-auto">
      <Card>
        <CardHeader class="text-center">
          <CardTitle class="text-6xl mb-4">404</CardTitle>
          <p class="text-xl text-muted-foreground">页面未找到</p>
        </CardHeader>
        <CardContent class="text-center">
          <p class="text-muted-foreground mb-6">
            抱歉，您访问的页面不存在。
          </p>
          <Button @click="goBack" class="mr-4">
            返回上页
          </Button>
          <Button @click="goHome" variant="outline">
            返回首页
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import Card from '@/components/ui/Card.vue'
import CardHeader from '@/components/ui/CardHeader.vue'
import CardContent from '@/components/ui/CardContent.vue'
import CardTitle from '@/components/ui/CardTitle.vue'
import Button from '@/components/ui/Button.vue'

const router = useRouter()

const goBack = () => {
  router.go(-1)
}

const goHome = () => {
  router.push('/')
}
</script>