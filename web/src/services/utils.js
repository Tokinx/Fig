import apiClient from './api'

export const utilsService = {
  // 预览链接信息
  async previewUrl(url) {
    try {
      const response = await apiClient.get(`/api/utils/preview?url=${encodeURIComponent(url)}`)
      return response
    } catch (error) {
      console.error('预览链接失败:', error)
      throw error
    }
  },

  // 验证URL格式
  async validateUrl(url) {
    try {
      const response = await apiClient.post('/api/utils/validate', { url })
      return response
    } catch (error) {
      console.error('验证URL失败:', error)
      throw error
    }
  },

  // 生成随机key
  async generateRandomKey(length = 6) {
    try {
      const response = await apiClient.get(`/api/utils/random?length=${length}`)
      return response
    } catch (error) {
      console.error('生成随机key失败:', error)
      throw error
    }
  }
}

export default utilsService