import { defineStore } from 'pinia'
import { linksService } from '@/services/links'

export const useLinksStore = defineStore('links', {
  state: () => ({
    links: [],
    pinnedLinks: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0
    }
  }),

  getters: {
    totalPages: (state) => Math.ceil(state.pagination.total / state.pagination.limit),
    hasNextPage: (state) => state.pagination.page < Math.ceil(state.pagination.total / state.pagination.limit),
    hasPrevPage: (state) => state.pagination.page > 1
  },

  actions: {
    async fetchLinks(page = 1, limit = 20) {
      this.loading = true
      this.error = null
      
      try {
        const response = await linksService.getLinks(page, limit)
        if (response.success) {
          const rawLinks = response.data.links || []
          
          // 确保rawLinks是数组
          if (!Array.isArray(rawLinks)) {
            console.error('Links data is not an array:', rawLinks)
            this.links = []
            this.error = '数据格式错误'
            return
          }
          
          // 过滤掉没有key的链接，避免undefined错误
          const validLinks = rawLinks.filter(link => {
            if (!link.key) {
              console.warn('Found link without key:', link)
              return false
            }
            return true
          })
          
          this.links = validLinks
          
          this.pagination = {
            page: response.data.page || 1,
            limit: response.data.limit || 20,
            total: response.data.total || 0
          }
        } else {
          this.error = response.error?.message || '获取链接失败'
        }
      } catch (error) {
        console.error('fetchLinks error:', error)
        this.error = error.message || '获取链接失败'
      } finally {
        this.loading = false
      }
    },

    async createLink(linkData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await linksService.createLink(linkData)
        if (response.success) {
          this.links.unshift(response.data)
          this.pagination.total++
          return response.data
        } else {
          this.error = response.error?.message || '创建链接失败'
          return null
        }
      } catch (error) {
        this.error = error.message || '创建链接失败'
        return null
      } finally {
        this.loading = false
      }
    },

    async updateLink(key, linkData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await linksService.updateLink(key, linkData)
        if (response.success) {
          const index = this.links.findIndex(link => link.key === key)
          if (index !== -1) {
            this.links[index] = response.data
          }
          return response.data
        } else {
          this.error = response.error?.message || '更新链接失败'
          return null
        }
      } catch (error) {
        this.error = error.message || '更新链接失败'
        return null
      } finally {
        this.loading = false
      }
    },

    async deleteLink(key) {
      if (!key || key === 'undefined') {
        this.error = '无效的链接key'
        return false
      }
      
      this.loading = true
      this.error = null
      
      try {
        const response = await linksService.deleteLink(key)
        if (response.success) {
          this.links = this.links.filter(link => link.key !== key)
          this.pagination.total--
          return true
        } else {
          this.error = response.error?.message || '删除链接失败'
          return false
        }
      } catch (error) {
        this.error = error.message || '删除链接失败'
        return false
      } finally {
        this.loading = false
      }
    },

    async pinLink(key) {
      try {
        const response = await linksService.pinLink(key)
        if (response.success) {
          const link = this.links.find(l => l.key === key)
          if (link) {
            link.is_pinned = true
          }
          await this.fetchPinnedLinks()
          return true
        } else {
          this.error = response.error?.message || '固定链接失败'
          return false
        }
      } catch (error) {
        this.error = error.message || '固定链接失败'
        return false
      }
    },

    async unpinLink(key) {
      try {
        const response = await linksService.unpinLink(key)
        if (response.success) {
          const link = this.links.find(l => l.key === key)
          if (link) {
            link.is_pinned = false
          }
          this.pinnedLinks = this.pinnedLinks.filter(l => l.key !== key)
          return true
        } else {
          this.error = response.error?.message || '取消固定失败'
          return false
        }
      } catch (error) {
        this.error = error.message || '取消固定失败'
        return false
      }
    },

    async fetchPinnedLinks() {
      try {
        const response = await linksService.getLinks(1, 100)
        if (response.success) {
          this.pinnedLinks = response.data.links.filter(link => link.is_pinned)
        }
      } catch (error) {
        console.error('获取固定链接失败:', error)
      }
    }
  }
})