import { verifyToken } from '../utils/jwt'

export async function authMiddleware(request, env, ctx, next) {
  console.log('=== authMiddleware started ===')
  console.log('Request URL:', request.url)
  
  const authHeader = request.headers.get('Authorization')
  console.log('Authorization header:', authHeader ? 'Bearer [TOKEN]' : 'Missing')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Missing or invalid authorization header')
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.substring(7)
  console.log('Token extracted, length:', token.length)
  
  try {
    console.log('=== Verifying token ===')
    console.log('JWT_SECRET available:', !!env.JWT_SECRET)
    
    const payload = await verifyToken(token, env.JWT_SECRET)
    console.log('Token verification successful')
    console.log('Token payload:', payload)
    
    // 将用户信息添加到请求上下文
    request.user = payload
    console.log('User info added to request context')
    
    console.log('=== authMiddleware completed, calling next handler ===')
    return await next()
  } catch (error) {
    console.error('=== authMiddleware error ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    const authError = new Error('Invalid token')
    authError.name = 'AuthenticationError'
    authError.originalError = error
    throw authError
  }
}

export function requireAuth(handler) {
  return async (request, env, ctx, params) => {
    return await authMiddleware(request, env, ctx, async () => {
      return await handler(request, env, ctx, params)
    })
  }
}