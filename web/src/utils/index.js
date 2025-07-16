import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function generateShortKey(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleString('zh-CN')
}

export function formatUrl(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url
  }
  return url
}

export function isValidUrl(url) {
  try {
    new URL(formatUrl(url))
    return true
  } catch {
    return false
  }
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
}