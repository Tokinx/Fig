// Database service class

// 列表缓存的保留 key(以 _fig_ 开头，save 接口会拦截同名 slug 防止冲突)
const CACHE_LIST_KEY = "_fig_cache_list";
// 缓存格式版本号：结构变化时递增，旧缓存自动失效重建
const CACHE_LIST_VERSION = 2;
// 非短链数据占用的保留 key
const RESERVED_KEYS = ["token", CACHE_LIST_KEY];

class DatabaseService {
  constructor(sqlite) {
    this.db = sqlite;
    this.init();
  }

  init() {
    this.db
      .prepare(
        "CREATE TABLE IF NOT EXISTS slug (key TEXT PRIMARY KEY, value TEXT, creation INTEGER DEFAULT (strftime('%s', 'now')))",
      )
      .run();
    this.db.prepare("CREATE INDEX IF NOT EXISTS idx_slug_creation ON slug(creation DESC)").run();
  }

  async value(key) {
    const stmt = this.db.prepare("SELECT value FROM slug WHERE key = ? LIMIT 1").bind(key);
    return await stmt.first("value");
  }

  async count({ where = "1=1", params = [] } = {}) {
    let stmt = this.db.prepare(`SELECT COUNT(*) as count FROM slug WHERE key NOT IN ('${RESERVED_KEYS.join("', '")}') AND ${where}`);
    if (params.length > 0) {
      stmt = stmt.bind(...params);
    }
    return await stmt.first("count");
  }

  async get({ where = "1=1", params = [], orderby = "creation", rows = 10, page = 1 } = {}) {
    const safeRows = Math.max(Number.parseInt(rows, 10) || 10, 1);
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeRows;
    let stmt = this.db.prepare(
      `SELECT * FROM slug WHERE key NOT IN ('${RESERVED_KEYS.join("', '")}') AND ${where} ORDER BY ${orderby} DESC LIMIT ${safeRows} OFFSET ${offset}`,
    );
    if (params.length > 0) {
      stmt = stmt.bind(...params);
    }
    return await stmt.all();
  }

  // 查询全部短链行(排除保留 key，按创建时间倒序)
  async all() {
    const stmt = this.db.prepare(
      `SELECT * FROM slug WHERE key NOT IN ('${RESERVED_KEYS.join("', '")}') ORDER BY creation DESC`,
    );
    return await stmt.all();
  }

  // 读取全量列表缓存：命中且版本一致直接返回；否则查询全量并写入缓存
  async cachedList() {
    const cached = await this.value(CACHE_LIST_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed._v === CACHE_LIST_VERSION && Array.isArray(parsed.list)) {
          return parsed.list;
        }
      } catch (e) {
        console.log(e.message);
      }
    }

    const { results = [] } = await this.all();
    const list = results.map((row) => {
      let value = {};
      try {
        value = JSON.parse(row.value);
      } catch (e) {
        console.log(e.message);
      }
      // 行级创建时间覆盖 value 内的编辑标志，直接提供前端所需字段
      return { ...value, key: row.key, createdAt: row.creation };
    });
    await this.put(CACHE_LIST_KEY, JSON.stringify({ _v: CACHE_LIST_VERSION, list }));
    return list;
  }

  // 失效全量列表缓存(创建/更新/删除后调用)
  async invalidateListCache() {
    return await this.delete(CACHE_LIST_KEY);
  }

  async put(key, value) {
    const existingValue = await this.value(key);
    let stmt;
    if (existingValue) {
      stmt = this.db.prepare("UPDATE slug SET value = ?1 WHERE key = ?2").bind(value, key);
    } else {
      stmt = this.db.prepare("INSERT INTO slug (key, value) VALUES (?1, ?2)").bind(key, value);
    }
    return await stmt.run();
  }

  async delete(key) {
    const stmt = this.db.prepare("DELETE FROM slug WHERE key = ?").bind(key);
    return await stmt.run();
  }
}

export default class Utils {
  request = {};
  env = {};
  PASSWORD = "";
  STORE = null;

  constructor(request, env) {
    this.request = request;
    this.env = env;
    this.PASSWORD = env.PASSWORD;
    this.STORE = new DatabaseService(env.SQLITE);
  }

  async SHA256(text) {
    text = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest({ name: "SHA-256" }, text);
    const hexString = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return hexString;
  }

  async Slug(len = null) {
    // 如果没有指定长度，从环境变量获取，默认为6
    if (len === null) {
      len = parseInt(this.env?.SLUG_LENGTH) || 6;
    }
    len = len || 6;
    // remind: about 61 million combinations
    const seed = "QWERTYUIOPASDFGHJKLZXCVBNM1234567890qwertyuiopasdfghjklzxcvbnm";
    const seedLen = seed.length;
    let slug = "";
    for (let i = 0; i < len; i++) {
      slug += seed.charAt(Math.floor(Math.random() * seedLen));
    }
    if (await this.STORE.value(slug)) return this.Slug(len);
    return slug;
  }

  async Cookie() {
    const cookies = this.request.headers.get("Cookie");
    let value = {};
    if (cookies) {
      value = cookies.split("; ").reduce((prev, current) => {
        const [key, value] = current.split("=");
        prev[key] = value;
        return prev;
      }, {});
    }
    return value;
  }

  CheckURL(url) {
    try {
      const urlObj = new URL(url);
      return ["http:", "https:"].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // format json string to object
  Parse(str, dft) {
    let value = dft ?? null;
    try {
      value = JSON.parse(str) || (dft ?? null);
    } catch (e) {
      console.log(e.message);
    }
    return value;
  }

  async ParseFirst(key) {
    return this.Parse(await this.STORE.value(key), {});
  }

  // HTTP and URL utility functions
  static buildUrlWithPath(baseUrl, additionalPath) {
    if (!additionalPath) return baseUrl;
    return baseUrl.endsWith("/") ? baseUrl + additionalPath.substring(1) : baseUrl + additionalPath;
  }

  static createDynamicScript({ template = "", targetUrl = "", notes = "" } = {}) {
    return `window.$figc = ${JSON.stringify({
      template,
      target_url: targetUrl,
      notes,
    })};`;
  }

  static async fetchWithOptions(url, options = {}) {
    try {
      const response = await fetch(url, options);
      const isHtml = response.headers.get("Content-Type")?.includes("text/html");

      return {
        response,
        isHtml,
        text: async () => await response.text(),
        success: response.ok,
      };
    } catch (error) {
      return {
        response: null,
        isHtml: false,
        text: async () => "",
        success: false,
        error,
      };
    }
  }

  static isHtmlResponse(response) {
    return response?.headers.get("Content-Type")?.includes("text/html") || false;
  }

  static cleanProxyHeaders(headers, { preserveEncoding = false, preserveLength = false } = {}) {
    const cleanHeaders = new Headers(headers);
    if (!preserveEncoding) {
      cleanHeaders.delete("content-encoding");
    }
    if (!preserveLength) {
      cleanHeaders.delete("content-length");
    }
    return cleanHeaders;
  }
}
