export async function corsMiddleware(request, env, ctx, next) {
  const origin = request.headers.get('Origin')
  const allowedOrigins = [
    'http://localhost:3000',
    'https://your-domain.com'
  ]

  // 预检请求处理
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    })
  }

  // 处理实际请求
  const response = await next()

  // 添加 CORS 头部
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  // 创建新的响应对象并添加 CORS 头部
  const corsResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers),
      ...corsHeaders
    }
  })

  return corsResponse
}