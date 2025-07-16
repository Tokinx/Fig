import { defineStore } from 'pinia'
import { navigationService } from '@/services/navigation'

export const useNavigationStore = defineStore('navigation', {
  state: () => ({
    config: {
      title: 'Fig 导航',
      description: '快速访问常用链接',
      theme: 'default'
    },
    pinnedLinks: [],
    loading: false,
    error: null,
    isEditMode: false
  }),

  getters: {
    sortedPinnedLinks: (state) => {
      const links = Array.isArray(state.pinnedLinks) ? state.pinnedLinks : []
      return [...links].sort((a, b) => (a.pinned_order || 0) - (b.pinned_order || 0))
    }
  },

  actions: {
    async fetchNavigationConfig() {
      this.loading = true
      this.error = null
      
      try {
        const response = await navigationService.getNavigationConfig()
        if (response.success) {
          this.config = { ...this.config, ...response.data.config }
          this.pinnedLinks = Array.isArray(response.data.pinnedLinks) ? response.data.pinnedLinks : []
        } else {
          this.error = response.error?.message || '获取导航配置失败'
        }
      } catch (error) {
        this.error = error.message || '获取导航配置失败'
      } finally {
        this.loading = false
      }
    },

    async fetchPinnedLinks() {
      this.loading = true
      
      try {
        const pinnedLinks = await navigationService.getPinnedLinks()
        this.pinnedLinks = Array.isArray(pinnedLinks) ? pinnedLinks : []
      } catch (error) {
        this.error = error.message || '获取固定链接失败'
      } finally {
        this.loading = false
      }
    },

    async updatePinnedOrder(newOrder) {
      this.loading = true
      this.error = null
      
      try {
        const response = await navigationService.updateNavigationOrder(newOrder)
        if (response.success) {
          // 更新本地排序
          this.pinnedLinks = this.pinnedLinks.map(link => {
            const orderIndex = newOrder.findIndex(item => item.key === link.key)
            return {
              ...link,
              pinned_order: orderIndex !== -1 ? newOrder[orderIndex].order : link.pinned_order
            }
          })
        } else {
          this.error = response.error?.message || '更新排序失败'
        }
      } catch (error) {
        this.error = error.message || '更新排序失败'
      } finally {
        this.loading = false
      }
    },

    toggleEditMode() {
      this.isEditMode = !this.isEditMode
    },

    setEditMode(mode) {
      this.isEditMode = mode
    }
  }
})