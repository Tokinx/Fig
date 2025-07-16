// 简单的 JWT 实现
export async function signToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24小时过期
  }

  const headerBase64 = btoa(JSON.stringify(header))
  const payloadBase64 = btoa(JSON.stringify(jwtPayload))
  
  const data = `${headerBase64}.${payloadBase64}`
  const signature = await sign(data, secret)
  
  return `${data}.${signature}`
}

export async function verifyToken(token, secret) {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }

  const [headerBase64, payloadBase64, signature] = parts
  const data = `${headerBase64}.${payloadBase64}`
  
  // 验证签名
  const expectedSignature = await sign(data, secret)
  if (signature !== expectedSignature) {
    throw new Error('Invalid signature')
  }

  // 解析 payload
  const payload = JSON.parse(atob(payloadBase64))
  
  // 检查过期时间
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }

  return payload
}

async function sign(data, secret) {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const dataBuffer = encoder.encode(data)
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, dataBuffer)
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}