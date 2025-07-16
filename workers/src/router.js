import { authHandler } from './handlers/auth'
import { linksHandler } from './handlers/links'
import { navigationHandler } from './handlers/navigation'
import { analyticsHandler } from './handlers/analytics'
import { utilsHandler } from './handlers/utils'

class Router {
  constructor() {
    this.routes = []
  }

  add(method, path, handler) {
    this.routes.push({ method, path, handler })
  }

  get(path, handler) {
    this.add('GET', path, handler)
  }

  post(path, handler) {
    this.add('POST', path, handler)
  }

  put(path, handler) {
    this.add('PUT', path, handler)
  }

  delete(path, handler) {
    this.add('DELETE', path, handler)
  }

  async handle(request, env, ctx) {
    const url = new URL(request.url)
    const method = request.method
    const pathname = url.pathname

    // 处理短链接访问
    if (method === 'GET' && pathname !== '/' && !pathname.startsWith('/api/')) {
      const key = pathname.substring(1)
      return await linksHandler.access(request, env, ctx, key)
    }

    // 处理 API 路由
    for (const route of this.routes) {
      const match = this.matchRoute(route.path, pathname)
      if (match && route.method === method) {
        return await route.handler(request, env, ctx, match.params)
      }
    }

    // 404 处理
    return new Response('Not Found', { status: 404 })
  }

  matchRoute(pattern, pathname) {
    // 简单的路径匹配实现
    const patternParts = pattern.split('/')
    const pathParts = pathname.split('/')

    if (patternParts.length !== pathParts.length) {
      return null
    }

    const params = {}
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].substring(1)
        params[paramName] = pathParts[i]
      } else if (patternParts[i] !== pathParts[i]) {
        return null
      }
    }

    return { params }
  }
}

// 创建路由实例
const router = new Router()

// 认证相关路由
router.post('/api/auth/login', authHandler.login)
router.post('/api/auth/logout', authHandler.logout)
router.get('/api/auth/me', authHandler.me)

// 链接管理路由
router.get('/api/links', linksHandler.list)
router.post('/api/links', linksHandler.create)
router.get('/api/links/:key', linksHandler.get)
router.put('/api/links/:key', linksHandler.update)
router.delete('/api/links/:key', linksHandler.delete)

// Pin 功能路由
router.post('/api/links/:key/pin', linksHandler.pin)
router.delete('/api/links/:key/pin', linksHandler.unpin)

// 导航页路由
router.get('/api/navigation', navigationHandler.getConfig)
router.put('/api/navigation/order', navigationHandler.updateOrder)

// 统计分析路由
router.get('/api/analytics/:key', analyticsHandler.getLinkStats)
router.get('/api/analytics/summary', analyticsHandler.getSummary)

// 工具接口路由
router.get('/api/utils/preview', utilsHandler.preview)
router.post('/api/utils/validate', utilsHandler.validate)
router.get('/api/utils/random', utilsHandler.random)

export { router }