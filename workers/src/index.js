import { router } from './router'
import { corsMiddleware } from './middleware/cors'
import { errorMiddleware } from './middleware/error'
import { DatabaseService } from './services/database'

export default {
  async fetch(request, env, ctx) {
    try {
      // 初始化数据库
      const db = new DatabaseService(env.DB)
      await db.init()
      
      // 应用 CORS 中间件
      const response = await corsMiddleware(request, env, ctx, async () => {
        // 路由处理
        return await router.handle(request, env, ctx)
      })

      return response
    } catch (error) {
      // 错误处理中间件
      return errorMiddleware(error, request, env, ctx)
    }
  }
}