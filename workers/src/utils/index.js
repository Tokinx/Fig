export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify({
    ...data,
    timestamp: Math.floor(Date.now() / 1000)
  }), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function successResponse(data, message = 'Success') {
  return jsonResponse({
    success: true,
    data,
    message
  })
}

export function errorResponse(error, status = 400) {
  return jsonResponse({
    success: false,
    error: {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      details: error.details
    }
  }, status)
}

export async function parseJsonBody(request) {
  try {
    console.log('=== parseJsonBody started ===')
    console.log('Request content-type:', request.headers.get('content-type'))
    
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid content type:', contentType)
      throw new Error('Invalid content type')
    }
    
    console.log('Content type validation passed')
    console.log('Parsing JSON body...')
    
    const body = await request.json()
    console.log('JSON parsing successful')
    console.log('Parsed body:', body)
    console.log('=== parseJsonBody completed ===')
    
    return body
  } catch (error) {
    console.error('=== parseJsonBody error ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    const parseError = new Error('Invalid JSON body')
    parseError.name = 'ValidationError'
    parseError.originalError = error
    throw parseError
  }
}

export function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function validateUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function formatUrl(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url
  }
  return url
}

export function isExpired(timestamp) {
  if (!timestamp) return false
  return Date.now() / 1000 > timestamp
}