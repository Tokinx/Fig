<template>
  <div class="min-h-screen bg-background flex items-center justify-center">
    <div class="max-w-md w-full mx-auto">
      <Card>
        <CardHeader class="text-center">
          <CardTitle class="text-3xl font-bold text-primary mb-2">Fig</CardTitle>
          <p class="text-muted-foreground">短链接服务系统</p>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <Label for="password">管理员密码</Label>
              <Input
                id="password"
                type="password"
                v-model="password"
                placeholder="请输入管理员密码"
                :disabled="loading"
                required
              />
            </div>
            
            <div v-if="error" class="text-sm text-destructive">
              {{ error }}
            </div>
            
            <Button 
              type="submit" 
              class="w-full"
              :disabled="loading"
            >
              {{ loading ? '登录中...' : '登录' }}
            </Button>
          </form>
          
          <div class="mt-6 text-center">
            <router-link 
              to="/navigation" 
              class="text-sm text-primary hover:underline"
            >
              访问导航页
            </router-link>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Card from '@/components/ui/Card.vue'
import CardHeader from '@/components/ui/CardHeader.vue'
import CardContent from '@/components/ui/CardContent.vue'
import CardTitle from '@/components/ui/CardTitle.vue'
import Label from '@/components/ui/Label.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'

const router = useRouter()
const authStore = useAuthStore()

const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const success = await authStore.login(password.value)
    if (success) {
      router.push('/dashboard')
    } else {
      error.value = authStore.error || '登录失败'
    }
  } catch (err) {
    error.value = err.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>