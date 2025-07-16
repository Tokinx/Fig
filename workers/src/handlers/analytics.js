import { DatabaseService } from '../services/database'
import { requireAuth } from '../middleware/auth'
import { successResponse, errorResponse } from '../utils/index'

export const analyticsHandler = {
  getLinkStats: requireAuth(async (request, env, ctx, params) => {
    try {
      const { key } = params
      const db = new DatabaseService(env.DB)
      
      const link = await db.getLinkByKey(key)
      if (!link) {
        return errorResponse({ message: '链接不存在' }, 404)
      }

      const analytics = await db.getAnalytics(key)
      
      // 统计数据处理
      const stats = processAnalytics(analytics)
      
      return successResponse({
        link,
        stats,
        analytics: analytics.slice(0, 100) // 只返回最近100条记录
      })
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  }),

  getSummary: requireAuth(async (request, env, ctx) => {
    try {
      const db = new DatabaseService(env.DB)
      const summaryStats = await db.getSummaryStats()
      
      // 获取最近的访问统计
      const recentAnalytics = await db.getAnalytics('')
      const recentStats = processAnalytics(recentAnalytics)
      
      return successResponse({
        summary: summaryStats,
        recent: recentStats
      })
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  })
}

function processAnalytics(analytics) {
  const total = analytics.length
  
  // 按日期统计
  const dailyStats = {}
  
  // 按国家统计
  const countryStats = {}
  
  // 按设备类型统计
  const deviceStats = {
    desktop: 0,
    mobile: 0,
    tablet: 0
  }
  
  // 按小时统计
  const hourlyStats = new Array(24).fill(0)
  
  analytics.forEach(record => {
    const date = new Date(record.timestamp * 1000)
    const dateStr = date.toISOString().split('T')[0]
    const hour = date.getHours()
    
    // 日期统计
    dailyStats[dateStr] = (dailyStats[dateStr] || 0) + 1
    
    // 国家统计
    if (record.country) {
      countryStats[record.country] = (countryStats[record.country] || 0) + 1
    }
    
    // 设备类型统计
    if (record.device_type && deviceStats.hasOwnProperty(record.device_type)) {
      deviceStats[record.device_type]++
    }
    
    // 小时统计
    hourlyStats[hour]++
  })
  
  // 转换为图表友好的格式
  const dailyChart = Object.entries(dailyStats)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
  
  const countryChart = Object.entries(countryStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }))
  
  const deviceChart = Object.entries(deviceStats)
    .map(([type, count]) => ({ type, count }))
  
  const hourlyChart = hourlyStats.map((count, hour) => ({ hour, count }))
  
  return {
    total,
    daily: dailyChart,
    countries: countryChart,
    devices: deviceChart,
    hourly: hourlyChart
  }
}