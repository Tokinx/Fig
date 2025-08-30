// Database service class
class DatabaseService {
	constructor(sqlite) {
		this.db = sqlite;
		this.init();
	}

	init() {
		this.db.prepare(
			"CREATE TABLE IF NOT EXISTS slug (key TEXT PRIMARY KEY, value TEXT, creation INTEGER DEFAULT (strftime('%s', 'now')))"
		).run();
	}

	async value(key) {
		const stmt = this.db.prepare('SELECT value FROM slug WHERE key = ? LIMIT 1').bind(key);
		return await stmt.first('value');
	}

	async count({ where = '1=1' } = {}) {
		const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM slug WHERE key <> 'token' AND ${where}`);
		return await stmt.first('count');
	}

	async get({ where = '1=1', orderby = 'creation', rows = 10, page = 1 } = {}) {
		const offset = Math.max(page - 1, 0) * rows;
		const stmt = this.db.prepare(`SELECT * FROM slug WHERE key <> 'token' AND ${where} ORDER BY ${orderby} DESC LIMIT ${rows} OFFSET ${offset}`);
		return await stmt.all();
	}

	async put(key, value) {
		const existingValue = await this.value(key);
		let stmt;
		if (existingValue) {
			stmt = this.db.prepare('UPDATE slug SET value = ?1 WHERE key = ?2').bind(value, key);
		} else {
			stmt = this.db.prepare('INSERT INTO slug (key, value) VALUES (?1, ?2)').bind(key, value);
		}
		return await stmt.run();
	}

	async delete(key) {
		const stmt = this.db.prepare('DELETE FROM slug WHERE key = ?').bind(key);
		return await stmt.run();
	}
}

export default class Utils {
	request = {};
	env = {};
	PASSWORD = '';
	STORE = null;

	constructor(request, env) {
		this.request = request;
		this.env = env;
		this.PASSWORD = env.PASSWORD;
		this.STORE = new DatabaseService(env.SQLITE);
	}

	async SHA256(text) {
		text = new TextEncoder().encode(text);
		const digest = await crypto.subtle.digest({ name: 'SHA-256' }, text);
		const hexString = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
		return hexString;
	}

	async Slug(len = null) {
		// 如果没有指定长度，从环境变量获取，默认为6
		if (len === null) {
			len = parseInt(this.env?.SLUG_LENGTH) || 6;
		}
		len = len || 6;
		// remind: about 61 million combinations
		const seed = 'QWERTYUIOPASDFGHJKLZXCVBNM1234567890qwertyuiopasdfghjklzxcvbnm';
		const seedLen = seed.length;
		let slug = '';
		for (let i = 0; i < len; i++) {
			slug += seed.charAt(Math.floor(Math.random() * seedLen));
		}
		if (await this.STORE.value(slug)) return this.Slug(len);
		return slug;
	}

	async Cookie() {
		const cookies = this.request.headers.get('Cookie');
		let value = {};
		if (cookies) {
			value = cookies.split('; ').reduce((prev, current) => {
				const [key, value] = current.split('=');
				prev[key] = value;
				return prev;
			}, {});
		}
		return value;
	}

	CheckURL(url) {
		try {
			const urlObj = new URL(url);
			return ['http:', 'https:'].includes(urlObj.protocol);
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
		return baseUrl.endsWith('/') ? baseUrl + additionalPath.substring(1) : baseUrl + additionalPath;
	}

	static createDynamicScript(mode, url, notes = '') {
		return `window.__PAGE__ = '${mode}'; window.__URL__ = '${url}'; window.__NOTES__ = ${JSON.stringify(notes)};`;
	}

	static async fetchWithOptions(url, options = {}) {
		try {
			const response = await fetch(url, options);
			const isHtml = response.headers.get('Content-Type')?.includes('text/html');
			
			return {
				response,
				isHtml,
				text: async () => await response.text(),
				success: response.ok
			};
		} catch (error) {
			return {
				response: null,
				isHtml: false,
				text: async () => '',
				success: false,
				error
			};
		}
	}

	static isHtmlResponse(response) {
		return response?.headers.get('Content-Type')?.includes('text/html') || false;
	}

	static cleanProxyHeaders(headers) {
		const cleanHeaders = new Headers(headers);
		cleanHeaders.delete('content-encoding');
		cleanHeaders.delete('content-length');
		return cleanHeaders;
	}
}
