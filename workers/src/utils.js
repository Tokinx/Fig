export default class Utils {
	request = {};
	env = {};
	PASSWORD = '';
	STORE = new (function () {})();

	constructor(request, env) {
		this.request = request;
		this.env = env; // 保存环境变量引用
		this.PASSWORD = env.PASSWORD;
		this.STORE = new (function (SQL) {
			let stmt = null;

			// 创建主表
			SQL.prepare(
				"CREATE TABLE IF NOT EXISTS slug (key TEXT PRIMARY KEY, value TEXT, creation INTEGER DEFAULT (strftime('%s', 'now')))"
			).run();

			this.value = async (key) => {
				stmt = SQL.prepare('SELECT value FROM slug WHERE key = ? LIMIT 1').bind(key);
				const val = await stmt.first('value');
				return val;
			};
			this.count = async ({ where }) => {
				where = where || '1=1';
				stmt = SQL.prepare(`SELECT COUNT(*) as count FROM slug WHERE key <> 'token' AND ${where}`);
				const val = await stmt.first('count');
				return val;
			};
			this.get = async ({ where, orderby, rows, page }) => {
				where = where || '1=1';
				orderby = orderby || 'creation';
				rows = rows || 10;
				page = Math.max(page - 1, 0) * rows;
				stmt = SQL.prepare(`SELECT * FROM slug WHERE key <> 'token' AND ${where} ORDER BY ${orderby} DESC LIMIT ${rows} OFFSET ${page}`);
				return await stmt.all();
			};
			this.put = async (key, value) => {
				if (await this.value(key)) {
					stmt = SQL.prepare('UPDATE slug SET value = ?1 WHERE key = ?2').bind(value, key);
				} else {
					stmt = SQL.prepare('INSERT INTO slug (key, value) VALUES (?1, ?2)').bind(key, value);
				}
				return await stmt.run();
			};
			this.delete = async (key) => {
				stmt = await SQL.prepare('DELETE FROM slug WHERE key = ?').bind(key);
				return await stmt.run();
			};
		})(env.SQLITE);
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

	async CheckURL(url) {
		const exp = new RegExp(/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/);
		if (exp.test(url) == true) {
			if (url[0] == 'h') return true;
			else return false;
		} else {
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
}
