import apiClient from './api'

// 参数验证函数
const validateKey = (key) => {
  if (!key || key === 'undefined' || key === 'null' || typeof key !== 'string') {
    throw new Error('无效的链接key')
  }
  return key.trim()
}

const validatePagination = (page, limit) => {
  const validPage = Math.max(1, parseInt(page) || 1)
  const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 20))
  return { page: validPage, limit: validLimit }
}

export const linksService = {
  async getLinks(page = 1, limit = 20) {
    try {
      const { page: validPage, limit: validLimit } = validatePagination(page, limit)
      return await apiClient.get('/api/links', {
        params: { page: validPage, limit: validLimit }
      })
    } catch (error) {
      console.error('获取链接列表失败:', error)
      throw error
    }
  },

  async createLink(linkData) {
    try {
      if (!linkData || typeof linkData !== 'object') {
        throw new Error('链接数据格式不正确')
      }
      if (!linkData.url || typeof linkData.url !== 'string') {
        throw new Error('URL不能为空')
      }
      return await apiClient.post('/api/links', linkData)
    } catch (error) {
      console.error('创建链接失败:', error)
      throw error
    }
  },

  async getLinkByKey(key) {
    try {
      const validKey = validateKey(key)
      return await apiClient.get(`/api/links/${validKey}`)
    } catch (error) {
      console.error('获取链接失败:', error)
      throw error
    }
  },

  async updateLink(key, linkData) {
    try {
      const validKey = validateKey(key)
      if (!linkData || typeof linkData !== 'object') {
        throw new Error('链接数据格式不正确')
      }
      return await apiClient.put(`/api/links/${validKey}`, linkData)
    } catch (error) {
      console.error('更新链接失败:', error)
      throw error
    }
  },

  async deleteLink(key) {
    try {
      const validKey = validateKey(key)
      return await apiClient.delete(`/api/links/${validKey}`)
    } catch (error) {
      console.error('删除链接失败:', error)
      throw error
    }
  },

  async pinLink(key) {
    try {
      const validKey = validateKey(key)
      return await apiClient.post(`/api/links/${validKey}/pin`)
    } catch (error) {
      console.error('固定链接失败:', error)
      throw error
    }
  },

  async unpinLink(key) {
    try {
      const validKey = validateKey(key)
      return await apiClient.delete(`/api/links/${validKey}/pin`)
    } catch (error) {
      console.error('取消固定链接失败:', error)
      throw error
    }
  },

  async getAnalytics(key) {
    try {
      const validKey = validateKey(key)
      return await apiClient.get(`/api/analytics/${validKey}`)
    } catch (error) {
      console.error('获取链接分析失败:', error)
      throw error
    }
  },

  async getSummary() {
    try {
      return await apiClient.get('/api/analytics/summary')
    } catch (error) {
      console.error('获取分析摘要失败:', error)
      throw error
    }
  }
}