<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 目标URL -->
      <div class="md:col-span-2">
        <Label for="url">目标URL *</Label>
        <div class="relative">
          <Input
            id="url"
            v-model="form.url"
            placeholder="https://example.com"
            required
            :disabled="loading"
            @blur="validateUrlOnBlur"
            @input="clearUrlValidation"
          />
          <div v-if="urlValidating" class="absolute right-2 top-2.5 text-xs text-gray-500">
            验证中...
          </div>
          <div v-if="urlValidationError" class="absolute right-2 top-2.5 text-xs text-red-500">
            无效
          </div>
          <div v-if="urlValidationSuccess" class="absolute right-2 top-2.5 text-xs text-green-500">
            有效
          </div>
        </div>
        
        <!-- URL预览信息 -->
        <div v-if="urlPreview" class="mt-3 p-3 bg-gray-50 rounded-lg border">
          <div class="flex items-start space-x-3">
            <img v-if="urlPreview.favicon" :src="urlPreview.favicon" alt="favicon" class="w-5 h-5 mt-1" />
            <div class="flex-1">
              <h4 class="font-medium text-sm">{{ urlPreview.title || 'No title' }}</h4>
              <p v-if="urlPreview.description" class="text-xs text-gray-600 mt-1">{{ urlPreview.description }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ urlPreview.url }}</p>
            </div>
          </div>
        </div>
        
        <!-- 预览加载状态 -->
        <div v-if="previewLoading" class="mt-3 p-3 bg-gray-50 rounded-lg border">
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span class="text-sm text-gray-600">正在获取预览信息...</span>
          </div>
        </div>
      </div>

      <!-- 短链接 -->
      <div>
        <Label for="key">短链接 (留空自动生成)</Label>
        <div class="flex space-x-2">
          <Input
            id="key"
            v-model="form.key"
            placeholder="custom-link"
            :disabled="loading"
            class="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="generateRandomKey"
            :disabled="loading || randomKeyGenerating"
            class="px-3"
          >
            {{ randomKeyGenerating ? '...' : '随机' }}
          </Button>
        </div>
      </div>

      <!-- 访问模式 -->
      <div>
        <Label for="mode">访问模式</Label>
        <select
          id="mode"
          v-model="form.mode"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="loading"
        >
          <option value="redirect">直接跳转</option>
          <option value="remind">提醒页面</option>
          <option value="cloaking">隐藏模式</option>
          <option value="proxy">代理模式</option>
        </select>
      </div>

      <!-- 链接标题 -->
      <div>
        <Label for="title">链接标题</Label>
        <div class="flex space-x-2">
          <Input
            id="title"
            v-model="form.title"
            placeholder="链接标题"
            :disabled="loading"
            class="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="fillFromPreview"
            :disabled="loading || !urlPreview"
            class="px-3"
          >
            填充
          </Button>
        </div>
      </div>

      <!-- 链接描述 -->
      <div>
        <Label for="description">链接描述</Label>
        <Input
          id="description"
          v-model="form.description"
          placeholder="链接描述"
          :disabled="loading"
        />
      </div>
    </div>

    <!-- 安全设置 -->
    <div class="border-t pt-4">
      <h3 class="text-sm font-medium mb-3">安全设置</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label for="access_password">访问密码</Label>
          <Input
            id="access_password"
            v-model="form.access_password"
            type="password"
            placeholder="留空无密码"
            :disabled="loading"
          />
        </div>
        
        <div>
          <Label for="access_limit">访问次数限制</Label>
          <Input
            id="access_limit"
            v-model="form.access_limit"
            type="number"
            placeholder="0 = 无限制"
            min="0"
            :disabled="loading"
          />
        </div>
        
        <div>
          <Label for="expires_at">过期时间</Label>
          <Input
            id="expires_at"
            v-model="form.expires_at"
            type="datetime-local"
            :disabled="loading"
          />
        </div>
      </div>
    </div>

    <!-- 自定义提醒设置 -->
    <div v-if="form.mode === 'remind'" class="border-t pt-4">
      <h3 class="text-sm font-medium mb-3">自定义提醒设置</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label for="custom_remind_text">提醒文本</Label>
          <Input
            id="custom_remind_text"
            v-model="form.custom_remind_text"
            placeholder="自定义提醒文本"
            :disabled="loading"
          />
        </div>
        
        <div>
          <Label for="custom_remind_button">按钮文本</Label>
          <Input
            id="custom_remind_button"
            v-model="form.custom_remind_button"
            placeholder="继续访问"
            :disabled="loading"
          />
        </div>
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="error" class="text-sm text-destructive">
      {{ error }}
    </div>

    <!-- 提交按钮 -->
    <div class="flex justify-end">
      <Button type="submit" :disabled="loading">
        {{ loading ? '创建中...' : '创建链接' }}
      </Button>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useLinksStore } from '@/stores/links'
import { generateShortKey, isValidUrl } from '@/utils'
import utilsService from '@/services/utils'
import Label from '@/components/ui/Label.vue'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'

const emit = defineEmits(['created'])

const linksStore = useLinksStore()

const loading = ref(false)
const error = ref('')

// URL验证状态
const urlValidating = ref(false)
const urlValidationError = ref(false)
const urlValidationSuccess = ref(false)

// 预览相关状态
const previewLoading = ref(false)
const urlPreview = ref(null)

// 随机生成状态
const randomKeyGenerating = ref(false)

const form = reactive({
  url: '',
  key: '',
  title: '',
  description: '',
  mode: 'redirect',
  access_password: '',
  access_limit: '',
  expires_at: '',
  custom_remind_text: '',
  custom_remind_button: '继续访问'
})

// URL验证
const validateUrlOnBlur = async () => {
  if (!form.url) return
  
  urlValidating.value = true
  urlValidationError.value = false
  urlValidationSuccess.value = false
  
  try {
    const result = await utilsService.validateUrl(form.url)
    if (result.success && result.data.valid) {
      urlValidationSuccess.value = true
      // 验证成功后获取预览信息
      getUrlPreview()
    } else {
      urlValidationError.value = true
    }
  } catch (error) {
    urlValidationError.value = true
    console.error('URL验证失败:', error)
  } finally {
    urlValidating.value = false
  }
}

// 清除URL验证状态
const clearUrlValidation = () => {
  urlValidationError.value = false
  urlValidationSuccess.value = false
  urlPreview.value = null
}

// 获取URL预览信息
const getUrlPreview = async () => {
  if (!form.url) return
  
  previewLoading.value = true
  
  try {
    const result = await utilsService.previewUrl(form.url)
    if (result.success) {
      urlPreview.value = result.data
    }
  } catch (error) {
    console.error('获取预览失败:', error)
  } finally {
    previewLoading.value = false
  }
}

// 从预览信息填充表单
const fillFromPreview = () => {
  if (!urlPreview.value) return
  
  if (urlPreview.value.title && !form.title) {
    form.title = urlPreview.value.title
  }
  if (urlPreview.value.description && !form.description) {
    form.description = urlPreview.value.description
  }
}

// 生成随机key
const generateRandomKey = async () => {
  randomKeyGenerating.value = true
  
  try {
    const result = await utilsService.generateRandomKey(6)
    if (result.success) {
      form.key = result.data.key
    }
  } catch (error) {
    console.error('生成随机key失败:', error)
  } finally {
    randomKeyGenerating.value = false
  }
}

const handleSubmit = async () => {
  error.value = ''
  
  // 验证URL
  if (!isValidUrl(form.url)) {
    error.value = 'URL格式不正确'
    return
  }
  
  // 生成短链接
  if (!form.key) {
    form.key = generateShortKey()
  }
  
  loading.value = true
  
  try {
    const linkData = {
      url: form.url,
      key: form.key,
      title: form.title,
      description: form.description,
      mode: form.mode,
      access_password: form.access_password || null,
      access_limit: form.access_limit ? parseInt(form.access_limit) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).getTime() / 1000 : null,
      custom_remind_text: form.custom_remind_text || null,
      custom_remind_button: form.custom_remind_button || '继续访问'
    }
    
    const result = await linksStore.createLink(linkData)
    
    if (result) {
      // 重置表单
      Object.keys(form).forEach(key => {
        if (key === 'mode') {
          form[key] = 'redirect'
        } else if (key === 'custom_remind_button') {
          form[key] = '继续访问'
        } else {
          form[key] = ''
        }
      })
      
      // 重置状态
      clearUrlValidation()
      
      emit('created', result)
    } else {
      error.value = linksStore.error || '创建链接失败'
    }
  } catch (err) {
    error.value = err.message || '创建链接失败'
  } finally {
    loading.value = false
  }
}
</script>