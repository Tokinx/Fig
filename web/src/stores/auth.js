import { defineStore } from 'pinia'
import { authService } from '@/services/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null
  }),

  actions: {
    async login(password) {
      this.loading = true
      this.error = null
      
      try {
        const response = await authService.login(password)
        if (response.success) {
          this.isAuthenticated = true
          this.user = response.data.user
          return true
        } else {
          this.error = response.error?.message || '登录失败'
          return false
        }
      } catch (error) {
        this.error = error.message || '登录失败'
        return false
      } finally {
        this.loading = false
      }
    },

    async logout() {
      this.loading = true
      
      try {
        await authService.logout()
      } finally {
        this.user = null
        this.isAuthenticated = false
        this.loading = false
      }
    },

    async getCurrentUser() {
      if (!authService.isAuthenticated()) {
        return false
      }

      this.loading = true
      
      try {
        const response = await authService.getCurrentUser()
        if (response.success) {
          this.user = response.data
          this.isAuthenticated = true
          return true
        } else {
          this.isAuthenticated = false
          return false
        }
      } catch (error) {
        this.isAuthenticated = false
        return false
      } finally {
        this.loading = false
      }
    },

    checkAuth() {
      this.isAuthenticated = authService.isAuthenticated()
    }
  }
})