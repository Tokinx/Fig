export function errorMiddleware(error, request, env, ctx) {
  console.error('Error:', error)

  // 根据错误类型返回不同的响应
  if (error.name === 'ValidationError') {
    return jsonResponse({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details
      }
    }, 400)
  }

  if (error.name === 'AuthenticationError') {
    return jsonResponse({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: error.message
      }
    }, 401)
  }

  if (error.name === 'NotFoundError') {
    return jsonResponse({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error.message
      }
    }, 404)
  }

  // 默认服务器错误
  return jsonResponse({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error'
    }
  }, 500)
}

function jsonResponse(data, status = 200) {
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