import { DatabaseService } from '../services/database'
import { requireAuth } from '../middleware/auth'
import { successResponse, errorResponse, parseJsonBody, generateId, validateUrl, formatUrl, isExpired } from '../utils/index'

export const linksHandler = {
  list: requireAuth(async (request, env, ctx) => {
    try {
      console.log('=== Links list handler started ===')
      const url = new URL(request.url)
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '20')
      
      console.log('Request params:', { page, limit })
      console.log('DB binding available:', !!env.DB)

      const db = new DatabaseService(env.DB)
      console.log('DatabaseService created')
      
      const result = await db.getLinks(page, limit)
      console.log('getLinks result:', result)

      return successResponse(result)
    } catch (error) {
      console.error('Links list handler error:', error)
      console.error('Error stack:', error.stack)
      return errorResponse({ message: error.message }, 500)
    }
  }),

  create: requireAuth(async (request, env, ctx) => {
    try {
      console.log('=== Links create handler started ===')
      console.log('Request URL:', request.url)
      console.log('Request method:', request.method)
      console.log('Request headers:', Object.fromEntries(request.headers))
      
      // 解析请求体
      console.log('=== Parsing request body ===')
      const linkData = await parseJsonBody(request)
      console.log('Parsed link data:', linkData)

      // 验证必填字段
      console.log('=== Validating required fields ===')
      if (!linkData.url) {
        console.log('Validation failed: URL is empty')
        return errorResponse({ message: 'URL不能为空' }, 400)
      }
      console.log('URL validation passed')

      // 验证URL格式
      console.log('=== Validating URL format ===')
      const formattedUrl = formatUrl(linkData.url)
      console.log('Formatted URL:', formattedUrl)
      if (!validateUrl(formattedUrl)) {
        console.log('URL format validation failed for:', formattedUrl)
        return errorResponse({ message: 'URL格式不正确' }, 400)
      }
      console.log('URL format validation passed')

      // 生成短链接key
      console.log('=== Generating short link key ===')
      if (!linkData.key) {
        linkData.key = generateId()
        console.log('Generated key:', linkData.key)
      } else {
        console.log('Using provided key:', linkData.key)
      }

      // 检查key是否已存在
      console.log('=== Checking if key already exists ===')
      console.log('Database binding available:', !!env.DB)
      const db = new DatabaseService(env.DB)
      console.log('DatabaseService instance created')
      
      const existingLink = await db.getLinkByKey(linkData.key)
      console.log('Existing link check result:', existingLink)
      if (existingLink) {
        console.log('Key already exists, returning conflict error')
        return errorResponse({ message: '短链接已存在' }, 409)
      }
      console.log('Key is available')

      // 格式化URL
      console.log('=== Formatting URL ===')
      linkData.url = formattedUrl
      console.log('Final URL:', linkData.url)

      // 准备完整的链接数据
      console.log('=== Preparing link data for database ===')
      const fullLinkData = {
        key: linkData.key,
        url: linkData.url,
        title: linkData.title || '',
        description: linkData.description || '',
        mode: linkData.mode || 'redirect',
        access_password: linkData.access_password || null,
        access_limit: linkData.access_limit || null,
        expires_at: linkData.expires_at || null,
        custom_remind_text: linkData.custom_remind_text || null,
        custom_remind_button: linkData.custom_remind_button || null,
        is_pinned: linkData.is_pinned || false,
        pinned_order: linkData.pinned_order || 0,
        pinned_icon: linkData.pinned_icon || null,
        pinned_color: linkData.pinned_color || null
      }
      console.log('Full link data:', fullLinkData)

      // 创建链接
      console.log('=== Creating link in database ===')
      const link = await db.createLink(fullLinkData)
      console.log('Link created successfully:', link)

      console.log('=== Links create handler completed successfully ===')
      return successResponse(link, '链接创建成功')
    } catch (error) {
      console.error('=== Links create handler error ===')
      console.error('Error message:', error.message)
      console.error('Error name:', error.name)
      console.error('Error stack:', error.stack)
      console.error('Error details:', error)
      
      // 根据错误类型提供更详细的错误信息
      let errorMessage = error.message
      let errorCode = 'UNKNOWN_ERROR'
      
      if (error.name === 'ValidationError') {
        errorCode = 'VALIDATION_ERROR'
        errorMessage = '请求数据格式错误'
      } else if (error.message.includes('D1_ERROR')) {
        errorCode = 'DATABASE_ERROR'
        errorMessage = '数据库操作失败'
      } else if (error.message.includes('SQLITE_CONSTRAINT')) {
        errorCode = 'CONSTRAINT_ERROR'
        errorMessage = '数据约束冲突'
      }
      
      return errorResponse({ 
        message: errorMessage,
        code: errorCode,
        details: error.stack
      }, 500)
    }
  }),

  get: requireAuth(async (request, env, ctx, params) => {
    try {
      const { key } = params
      const db = new DatabaseService(env.DB)
      const link = await db.getLinkByKey(key)

      if (!link) {
        return errorResponse({ message: '链接不存在' }, 404)
      }

      return successResponse(link)
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  }),

  update: requireAuth(async (request, env, ctx, params) => {
    try {
      const { key } = params
      const linkData = await parseJsonBody(request)

      // 验证URL格式
      if (linkData.url && !validateUrl(formatUrl(linkData.url))) {
        return errorResponse({ message: 'URL格式不正确' }, 400)
      }

      const db = new DatabaseService(env.DB)
      const existingLink = await db.getLinkByKey(key)
      if (!existingLink) {
        return errorResponse({ message: '链接不存在' }, 404)
      }

      // 格式化URL
      if (linkData.url) {
        linkData.url = formatUrl(linkData.url)
      }

      // 更新链接
      const link = await db.updateLink(key, linkData)

      return successResponse(link, '链接更新成功')
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  }),

  delete: requireAuth(async (request, env, ctx, params) => {
    try {
      const { key } = params
      
      if (!key || key === 'undefined') {
        return errorResponse({ message: '无效的链接key' }, 400)
      }
      
      const db = new DatabaseService(env.DB)
      
      const existingLink = await db.getLinkByKey(key)
      if (!existingLink) {
        return errorResponse({ message: '链接不存在' }, 404)
      }

      await db.deleteLink(key)

      return successResponse(null, '链接删除成功')
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  }),

  pin: requireAuth(async (request, env, ctx, params) => {
    try {
      const { key } = params
      const db = new DatabaseService(env.DB)
      
      const existingLink = await db.getLinkByKey(key)
      if (!existingLink) {
        return errorResponse({ message: '链接不存在' }, 404)
      }

      await db.pinLink(key)

      return successResponse(null, '链接固定成功')
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  }),

  unpin: requireAuth(async (request, env, ctx, params) => {
    try {
      const { key } = params
      const db = new DatabaseService(env.DB)
      
      const existingLink = await db.getLinkByKey(key)
      if (!existingLink) {
        return errorResponse({ message: '链接不存在' }, 404)
      }

      await db.unpinLink(key)

      return successResponse(null, '取消固定成功')
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  }),

  async access(request, env, ctx, key) {
    try {
      const db = new DatabaseService(env.DB)
      const link = await db.getLinkByKey(key)

      if (!link) {
        return new Response('Link not found', { status: 404 })
      }

      // 检查过期时间
      if (isExpired(link.expires_at)) {
        return new Response('Link expired', { status: 410 })
      }

      // 检查访问次数限制
      if (link.access_limit && link.clicks >= link.access_limit) {
        return new Response('Access limit exceeded', { status: 429 })
      }

      // 增加访问次数
      await db.incrementClicks(key)

      // 记录访问统计
      await recordAccess(request, env, key)

      // 根据模式处理访问
      switch (link.mode) {
        case 'redirect':
          return Response.redirect(link.url, 302)
        
        case 'remind':
          return generateRemindPage(link)
        
        case 'cloaking':
          return generateCloakingPage(link)
        
        case 'proxy':
          return proxyRequest(link.url)
        
        default:
          return Response.redirect(link.url, 302)
      }
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  }
}

async function recordAccess(request, env, key) {
  try {
    const db = new DatabaseService(env.DB)
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('X-Forwarded-For') || 
                    '127.0.0.1'
    
    const userAgent = request.headers.get('User-Agent') || ''
    const referer = request.headers.get('Referer') || ''
    
    await db.recordAnalytics({
      short_key: key,
      ip_address: clientIP,
      user_agent: userAgent,
      referer: referer,
      country: request.cf?.country || '',
      city: request.cf?.city || '',
      device_type: getDeviceType(userAgent)
    })
  } catch (error) {
    console.error('Failed to record analytics:', error)
  }
}

function getDeviceType(userAgent) {
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile')) return 'mobile'
  if (ua.includes('tablet')) return 'tablet'
  return 'desktop'
}

function generateRemindPage(link) {
  const title = link.title || 'Link Access'
  const remindText = link.custom_remind_text || '您即将访问外部链接'
  const buttonText = link.custom_remind_button || '继续访问'
  
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { text-align: center; padding: 40px 20px; }
        .warning { color: #f56565; font-size: 18px; margin-bottom: 20px; }
        .url { background: #f7fafc; padding: 10px; border-radius: 5px; word-break: break-all; }
        .button { display: inline-block; padding: 12px 24px; background: #3182ce; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔗 ${title}</h1>
        <p class="warning">${remindText}</p>
        <div class="url">${link.url}</div>
        <a href="${link.url}" class="button">${buttonText}</a>
      </div>
    </body>
    </html>
  `
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}

function generateCloakingPage(link) {
  const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${link.title || 'Loading...'}</title>
      <style>
        body { margin: 0; padding: 0; overflow: hidden; }
        iframe { width: 100%; height: 100vh; border: none; }
      </style>
    </head>
    <body>
      <iframe src="${link.url}" title="${link.title || 'Content'}"></iframe>
    </body>
    </html>
  `
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}

async function proxyRequest(url) {
  try {
    const response = await fetch(url)
    const headers = new Headers(response.headers)
    
    // 移除一些可能导致问题的头部
    headers.delete('content-security-policy')
    headers.delete('x-frame-options')
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  } catch (error) {
    return new Response('Proxy request failed', { status: 502 })
  }
}