import { signToken, verifyToken } from '../utils/jwt'
import { successResponse, errorResponse, parseJsonBody } from '../utils/index'

export const authHandler = {
  async login(request, env, ctx) {
    try {
      const { password } = await parseJsonBody(request)
      
      if (!password) {
        return errorResponse({ message: '密码不能为空' }, 400)
      }

      if (password !== env.ADMIN_PASSWORD) {
        return errorResponse({ message: '密码错误' }, 401)
      }

      const token = await signToken({ 
        role: 'admin',
        loginTime: Date.now()
      }, env.JWT_SECRET)

      return successResponse({
        token,
        user: { role: 'admin' }
      }, '登录成功')
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  },

  async logout(request, env, ctx) {
    // 由于是无状态的 JWT，logout 主要是客户端删除 token
    return successResponse(null, '退出成功')
  },

  async me(request, env, ctx) {
    try {
      const authHeader = request.headers.get('Authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse({ message: '未授权' }, 401)
      }

      const token = authHeader.substring(7)
      const payload = await verifyToken(token, env.JWT_SECRET)

      return successResponse({
        role: payload.role,
        loginTime: payload.loginTime
      })
    } catch (error) {
      return errorResponse({ message: '无效的token' }, 401)
    }
  }
}