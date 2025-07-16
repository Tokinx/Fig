import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/index.css'

// 路由配置
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('./pages/Home.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('./pages/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/navigation',
    name: 'Navigation',
    component: () => import('./pages/Navigation.vue')
  },
  {
    path: '/access/:key',
    name: 'LinkAccess',
    component: () => import('./pages/LinkAccess.vue')
  },
  {
    path: '/404',
    name: '404',
    component: () => import('./pages/404.vue')
  },
  {
    path: '/:key',
    name: 'ShortLink',
    component: () => import('./pages/LinkAccess.vue'),
    beforeEnter: (to, from, next) => {
      // 检查是否为短链接格式（避免与其他路由冲突）
      const key = to.params.key
      if (key && key.length > 0 && !key.includes('/')) {
        next()
      } else {
        next('/404')
      }
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 检查是否需要登录
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('fig-token')
    if (!token) {
      next('/')
      return
    }
  }
  next()
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')