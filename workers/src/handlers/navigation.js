import { DatabaseService } from '../services/database'
import { requireAuth } from '../middleware/auth'
import { successResponse, errorResponse, parseJsonBody } from '../utils/index'

export const navigationHandler = {
  async getConfig(request, env, ctx) {
    try {
      const db = new DatabaseService(env.DB)
      
      // 获取导航页配置
      const config = await db.getNavigationConfig('navigation') || {
        title: 'Fig 导航',
        description: '快速访问常用链接',
        theme: 'default'
      }
      
      // 获取固定链接
      const pinnedLinks = await db.getPinnedLinks()
      
      return successResponse({
        config,
        pinnedLinks
      })
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  },

  updateOrder: requireAuth(async (request, env, ctx) => {
    try {
      const { order } = await parseJsonBody(request)
      
      if (!Array.isArray(order)) {
        return errorResponse({ message: '排序数据格式错误' }, 400)
      }

      const db = new DatabaseService(env.DB)
      await db.updatePinnedOrder(order)

      return successResponse(null, '排序更新成功')
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  }),

  updateConfig: requireAuth(async (request, env, ctx) => {
    try {
      const config = await parseJsonBody(request)
      
      const db = new DatabaseService(env.DB)
      await db.setNavigationConfig('navigation', config)

      return successResponse(config, '配置更新成功')
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  })
}