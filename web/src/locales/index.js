import { createI18n } from 'vue-i18n'
import messages from '@intlify/unplugin-vue-i18n/messages'

// 支持的语言列表
export const supportedLocales = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' }
]

// 获取默认语言
function getDefaultLocale() {
  // 优先使用localStorage中保存的语言
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && supportedLocales.find(l => l.code === savedLocale)) {
    return savedLocale
  }
  
  // 其次使用浏览器语言
  const browserLocale = navigator.language
  if (browserLocale.startsWith('zh')) {
    // 检测是否为繁体中文
    if (browserLocale.includes('TW') || browserLocale.includes('HK') || browserLocale.includes('MO')) {
      return 'zh-TW'
    }
    return 'zh-CN'
  }
  
  // 默认返回英文
  return 'en'
}

// 创建i18n实例
export const i18n = createI18n({
  legacy: false, // 使用Composition API
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages,
  globalInjection: true
})

// 切换语言的工具函数
export function setLocale(locale) {
  if (supportedLocales.find(l => l.code === locale)) {
    i18n.global.locale.value = locale
    localStorage.setItem('locale', locale)
    document.documentElement.lang = locale
    
    // 更新页面标题
    updatePageTitle()
  }
}

// 更新页面标题的工具函数
export function updatePageTitle() {
  // 获取当前路由的标题键
  const router = window.router
  if (router?.currentRoute?.value?.meta?.titleKey) {
    const { t } = i18n.global
    document.title = t(router.currentRoute.value.meta.titleKey)
  }
}

// 获取当前语言
export function getCurrentLocale() {
  return i18n.global.locale.value
}

// 获取当前语言的显示名称
export function getCurrentLocaleName() {
  const current = supportedLocales.find(l => l.code === getCurrentLocale())
  return current ? current.name : 'English'
}
