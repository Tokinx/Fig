import { successResponse, errorResponse, parseJsonBody, generateId, validateUrl } from '../utils/index'

export const utilsHandler = {
  async preview(request, env, ctx) {
    try {
      const url = new URL(request.url)
      const targetUrl = url.searchParams.get('url')
      
      if (!targetUrl) {
        return errorResponse({ message: 'URL参数缺失' }, 400)
      }

      if (!validateUrl(targetUrl)) {
        return errorResponse({ message: 'URL格式不正确' }, 400)
      }

      // 获取页面信息
      const pageInfo = await fetchPageInfo(targetUrl)
      
      return successResponse(pageInfo)
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  },

  async validate(request, env, ctx) {
    try {
      const { url } = await parseJsonBody(request)
      
      if (!url) {
        return errorResponse({ message: 'URL不能为空' }, 400)
      }

      const isValid = validateUrl(url)
      
      return successResponse({
        valid: isValid,
        url: url
      })
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  },

  async random(request, env, ctx) {
    try {
      const url = new URL(request.url)
      const length = parseInt(url.searchParams.get('length') || '6')
      
      if (length < 3 || length > 20) {
        return errorResponse({ message: '长度必须在3-20之间' }, 400)
      }

      const randomKey = generateId(length)
      
      return successResponse({
        key: randomKey
      })
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  }
}

async function fetchPageInfo(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FigBot/1.0)'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    
    // 解析HTML获取基本信息
    const title = extractTitle(html)
    const description = extractDescription(html)
    const favicon = extractFavicon(html, url)
    const image = extractImage(html, url)
    
    return {
      title,
      description,
      favicon,
      image,
      url
    }
  } catch (error) {
    return {
      title: url,
      description: '',
      favicon: '',
      image: '',
      url,
      error: error.message
    }
  }
}

function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    return titleMatch[1].trim()
  }
  
  const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
  if (ogTitleMatch) {
    return ogTitleMatch[1].trim()
  }
  
  return ''
}

function extractDescription(html) {
  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)
  if (descMatch) {
    return descMatch[1].trim()
  }
  
  const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)
  if (ogDescMatch) {
    return ogDescMatch[1].trim()
  }
  
  return ''
}

function extractFavicon(html, baseUrl) {
  const faviconMatch = html.match(/<link[^>]*rel="icon"[^>]*href="([^"]+)"/i) ||
                       html.match(/<link[^>]*rel="shortcut icon"[^>]*href="([^"]+)"/i)
  
  if (faviconMatch) {
    const href = faviconMatch[1]
    return href.startsWith('http') ? href : new URL(href, baseUrl).href
  }
  
  return new URL('/favicon.ico', baseUrl).href
}

function extractImage(html, baseUrl) {
  const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
  if (ogImageMatch) {
    const href = ogImageMatch[1]
    return href.startsWith('http') ? href : new URL(href, baseUrl).href
  }
  
  return ''
}