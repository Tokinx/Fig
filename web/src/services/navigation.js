import apiClient from './api'

// 数组类型安全处理函数
const ensureArray = (data) => {
  if (Array.isArray(data)) {
    return data
  }
  if (data && typeof data === 'object' && data.pinnedLinks) {
    return Array.isArray(data.pinnedLinks) ? data.pinnedLinks : []
  }
  return []
}

export const navigationService = {
  async getNavigationConfig() {
    try {
      const response = await apiClient.get('/api/navigation')
      if (response.success) {
        // 确保数据格式正确
        const data = response.data || {}
        return {
          ...response,
          data: {
            config: data.config || {},
            pinnedLinks: ensureArray(data.pinnedLinks || data)
          }
        }
      }
      return response
    } catch (error) {
      console.error('获取导航配置失败:', error)
      throw error
    }
  },

  async updateNavigationOrder(order) {
    try {
      if (!Array.isArray(order)) {
        throw new Error('order 必须是数组格式')
      }
      return await apiClient.put('/api/navigation/order', { order })
    } catch (error) {
      console.error('更新导航顺序失败:', error)
      throw error
    }
  },

  async getPinnedLinks() {
    try {
      const response = await apiClient.get('/api/navigation')
      if (response.success) {
        const data = response.data || {}
        return ensureArray(data.pinnedLinks || data)
      }
      return []
    } catch (error) {
      console.error('获取固定链接失败:', error)
      return []
    }
  }
}