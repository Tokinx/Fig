import apiClient from './api'

export const authService = {
  async login(password) {
    const response = await apiClient.post('/api/auth/login', { password })
    if (response.success && response.data.token) {
      localStorage.setItem('fig-token', response.data.token)
    }
    return response
  },

  async logout() {
    try {
      await apiClient.post('/api/auth/logout')
    } finally {
      localStorage.removeItem('fig-token')
    }
  },

  async getCurrentUser() {
    return await apiClient.get('/api/auth/me')
  },

  isAuthenticated() {
    return !!localStorage.getItem('fig-token')
  }
}