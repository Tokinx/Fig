export class DatabaseService {
  constructor(db) {
    this.db = db
    this.initialized = false
  }

  async init() {
    if (this.initialized) {
      console.log('=== DatabaseService already initialized, skipping ===')
      return
    }
    
    console.log('=== DatabaseService.init() called ===')
    // 创建表结构
    await this.createTables()
    this.initialized = true
    console.log('=== DatabaseService.init() completed ===')
  }

  async createTables() {
    console.log('=== Creating tables ===')
    
    // 创建链接表
    try {
      const createShortenTable = `CREATE TABLE IF NOT EXISTS shorten (
        key TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT,
        description TEXT,
        mode TEXT DEFAULT 'redirect',
        clicks INTEGER DEFAULT 0,
        access_password TEXT,
        access_limit INTEGER,
        expires_at INTEGER,
        custom_remind_text TEXT,
        custom_remind_button TEXT,
        is_pinned BOOLEAN DEFAULT FALSE,
        pinned_order INTEGER DEFAULT 0,
        pinned_icon TEXT,
        pinned_color TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now')),
        created_by TEXT DEFAULT 'admin'
      )`
      console.log('Executing SQL:', createShortenTable)
      // 处理换行符以避免 D1 本地环境的 incomplete input 错误
      await this.db.exec(createShortenTable.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim())
      console.log('=== shorten table created ===')
    } catch (error) {
      console.error('Error creating shorten table:', error)
      throw error
    }

    // 创建导航页配置表
    try {
      const createNavigationTable = `CREATE TABLE IF NOT EXISTS navigation_config (
        id INTEGER PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`
      console.log('Executing SQL:', createNavigationTable)
      // 处理换行符以避免 D1 本地环境的 incomplete input 错误
      await this.db.exec(createNavigationTable.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim())
      console.log('=== navigation_config table created ===')
    } catch (error) {
      console.error('Error creating navigation_config table:', error)
      throw error
    }

    // 创建访问统计表
    try {
      const createAnalyticsTable = `CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY,
        short_key TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s', 'now')),
        ip_address TEXT,
        user_agent TEXT,
        referer TEXT,
        country TEXT,
        city TEXT,
        device_type TEXT,
        FOREIGN KEY (short_key) REFERENCES shorten(key)
      )`
      console.log('Executing SQL:', createAnalyticsTable)
      // 处理换行符以避免 D1 本地环境的 incomplete input 错误
      await this.db.exec(createAnalyticsTable.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim())
      console.log('=== analytics table created ===')
    } catch (error) {
      console.error('Error creating analytics table:', error)
      throw error
    }

    // 创建索引
    try {
      await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_shorten_pinned ON shorten(is_pinned, pinned_order)`)
      await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_key ON analytics(short_key)`)
      await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp)`)
      console.log('=== indexes created ===')
    } catch (error) {
      console.error('Error creating indexes:', error)
      throw error
    }
  }

  // 链接相关操作
  async createLink(linkData) {
    try {
      console.log('=== DatabaseService.createLink started ===')
      console.log('Input linkData:', linkData)
      
      // 确保数据库已初始化
      console.log('=== Ensuring database is initialized ===')
      await this.init()
      console.log('Database initialization completed')
      
      console.log('=== Preparing SQL statement ===')
      const stmt = this.db.prepare(`
        INSERT INTO shorten (
          key, url, title, description, mode, access_password, access_limit, 
          expires_at, custom_remind_text, custom_remind_button, is_pinned, 
          pinned_order, pinned_icon, pinned_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      console.log('SQL statement prepared')
      
      console.log('=== Binding parameters ===')
      const params = [
        linkData.key,
        linkData.url,
        linkData.title,
        linkData.description,
        linkData.mode,
        linkData.access_password,
        linkData.access_limit,
        linkData.expires_at,
        linkData.custom_remind_text,
        linkData.custom_remind_button,
        linkData.is_pinned || false,
        linkData.pinned_order || 0,
        linkData.pinned_icon,
        linkData.pinned_color
      ]
      console.log('Parameters to bind:', params)
      
      console.log('=== Executing INSERT statement ===')
      const result = await stmt.bind(...params).run()
      console.log('INSERT result:', result)
      
      if (result.success) {
        console.log('Insert successful, fetching created link')
        const createdLink = await this.getLinkByKey(linkData.key)
        console.log('Created link:', createdLink)
        console.log('=== DatabaseService.createLink completed successfully ===')
        return createdLink
      } else {
        console.error('Insert failed, result:', result)
        throw new Error('Failed to create link - Database operation unsuccessful')
      }
    } catch (error) {
      console.error('=== DatabaseService.createLink error ===')
      console.error('Error message:', error.message)
      console.error('Error name:', error.name)
      console.error('Error stack:', error.stack)
      console.error('Error details:', error)
      
      // 重新抛出错误，保持原有的错误处理逻辑
      throw error
    }
  }

  async getLinkByKey(key) {
    try {
      console.log('=== DatabaseService.getLinkByKey started ===')
      console.log('Looking for key:', key)
      
      const stmt = this.db.prepare('SELECT * FROM shorten WHERE key = ?')
      console.log('SQL statement prepared')
      
      const result = await stmt.bind(key).first()
      console.log('Query result:', result)
      
      console.log('=== DatabaseService.getLinkByKey completed ===')
      return result
    } catch (error) {
      console.error('=== DatabaseService.getLinkByKey error ===')
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      throw error
    }
  }

  async updateLink(key, linkData) {
    const stmt = this.db.prepare(`
      UPDATE shorten SET
        url = ?, title = ?, description = ?, mode = ?, access_password = ?,
        access_limit = ?, expires_at = ?, custom_remind_text = ?,
        custom_remind_button = ?, pinned_icon = ?, pinned_color = ?,
        updated_at = strftime('%s', 'now')
      WHERE key = ?
    `)

    const result = await stmt.bind(
      linkData.url,
      linkData.title,
      linkData.description,
      linkData.mode,
      linkData.access_password,
      linkData.access_limit,
      linkData.expires_at,
      linkData.custom_remind_text,
      linkData.custom_remind_button,
      linkData.pinned_icon,
      linkData.pinned_color,
      key
    ).run()

    if (result.success) {
      return await this.getLinkByKey(key)
    }

    throw new Error('Failed to update link')
  }

  async deleteLink(key) {
    const stmt = this.db.prepare('DELETE FROM shorten WHERE key = ?')
    const result = await stmt.bind(key).run()
    return result.success
  }

  async getLinks(page = 1, limit = 20) {
    try {
      console.log('=== getLinks method started ===')
      console.log('Input params:', { page, limit })
      
      const offset = (page - 1) * limit
      console.log('Calculated offset:', offset)
      
      const stmt = this.db.prepare(`
        SELECT * FROM shorten
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      
      console.log('SQL prepared, executing with params:', { limit, offset })
      const queryResult = await stmt.bind(limit, offset).all()
      console.log('Query result structure:', queryResult)
      
      // Cloudflare D1 returns {results: [...], success: true}
      const results = queryResult.results || []
      console.log('Extracted results:', results)
      
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM shorten')
      console.log('Count query prepared, executing...')
      const countResult = await countStmt.first()
      console.log('Count result:', countResult)
      
      const response = {
        links: results,
        total: countResult.count || 0,
        page,
        limit
      }
      
      console.log('Final response:', response)
      return response
    } catch (error) {
      console.error('getLinks error:', error)
      console.error('Error stack:', error.stack)
      throw error
    }
  }

  async pinLink(key, order = 0) {
    const stmt = this.db.prepare(`
      UPDATE shorten SET
        is_pinned = TRUE,
        pinned_order = ?,
        updated_at = strftime('%s', 'now')
      WHERE key = ?
    `)

    const result = await stmt.bind(order, key).run()
    return result.success
  }

  async unpinLink(key) {
    const stmt = this.db.prepare(`
      UPDATE shorten SET
        is_pinned = FALSE,
        pinned_order = 0,
        updated_at = strftime('%s', 'now')
      WHERE key = ?
    `)

    const result = await stmt.bind(key).run()
    return result.success
  }

  async getPinnedLinks() {
    const stmt = this.db.prepare(`
      SELECT * FROM shorten
      WHERE is_pinned = TRUE
      ORDER BY pinned_order ASC, created_at DESC
    `)
    
    const queryResult = await stmt.all()
    return queryResult.results || []
  }

  async updatePinnedOrder(orderData) {
    const stmt = this.db.prepare(`
      UPDATE shorten SET
        pinned_order = ?,
        updated_at = strftime('%s', 'now')
      WHERE key = ?
    `)

    for (const item of orderData) {
      await stmt.bind(item.order, item.key).run()
    }

    return true
  }

  async incrementClicks(key) {
    const stmt = this.db.prepare(`
      UPDATE shorten SET
        clicks = clicks + 1,
        updated_at = strftime('%s', 'now')
      WHERE key = ?
    `)

    const result = await stmt.bind(key).run()
    return result.success
  }

  // 统计分析
  async recordAnalytics(data) {
    const stmt = this.db.prepare(`
      INSERT INTO analytics (
        short_key, ip_address, user_agent, referer, country, city, device_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const result = await stmt.bind(
      data.short_key,
      data.ip_address,
      data.user_agent,
      data.referer,
      data.country,
      data.city,
      data.device_type
    ).run()

    return result.success
  }

  async getAnalytics(key) {
    const stmt = this.db.prepare(`
      SELECT * FROM analytics
      WHERE short_key = ?
      ORDER BY timestamp DESC
      LIMIT 1000
    `)

    const queryResult = await stmt.bind(key).all()
    return queryResult.results || []
  }

  async getSummaryStats() {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_links,
        SUM(clicks) as total_clicks,
        COUNT(CASE WHEN is_pinned = TRUE THEN 1 END) as pinned_links
      FROM shorten
    `)

    const result = await stmt.first()
    return result
  }

  // 导航页配置
  async getNavigationConfig(key) {
    const stmt = this.db.prepare('SELECT value FROM navigation_config WHERE key = ?')
    const result = await stmt.bind(key).first()
    return result ? JSON.parse(result.value) : null
  }

  async setNavigationConfig(key, value) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO navigation_config (key, value, updated_at)
      VALUES (?, ?, strftime('%s', 'now'))
    `)

    const result = await stmt.bind(key, JSON.stringify(value)).run()
    return result.success
  }
}