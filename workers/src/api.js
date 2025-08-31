import { Hono } from 'hono';

const api = new Hono();

async function GetReqJson(request) {
	let data = {};
	try {
		const contentType = request.headers.get('Content-Type') || '';
		if (contentType.includes('application/json')) {
			data = (await request.json()) || {};
		} else if (contentType.includes('application/x-www-form-urlencoded')) {
			const formData = await request.formData();
			data = Object.fromEntries(formData);
		}
	} catch (e) {
		console.error('Failed to parse request body:', e.message);
	}
	return data;
}

export default class ControllerAPI {
	utils = {};

	constructor(utils) {
		this.utils = utils;
	}

	// Response helper functions
	createResponse(code, msg, data = null, status = 200, headers = {}) {
		return Response.json({ code, msg, data }, { status, headers });
	}

	createErrorResponse(code, msg, status = 400) {
		return this.createResponse(code, msg, null, status);
	}

	createSuccessResponse(data = null, msg = 'Success') {
		return this.createResponse(0, msg, data);
	}

	createCookieResponse(code, msg, data, cookieName, cookieValue, expires = null) {
		const cookieString = expires 
			? `${cookieName}=${cookieValue}; path=/; expires=${new Date(expires).toUTCString()}`
			: `${cookieName}=${cookieValue}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
		
		return this.createResponse(code, msg, data, 200, { 'Set-Cookie': cookieString });
	}

	async Gateway() {
		const { request } = this.utils;
		const url = new URL(request.url);
		const action = String(url.searchParams.get('action'));
		if (!this[action]) {
			return this.createErrorResponse(1000, 'Invalid action.', 404);
		}
		return await this[action]();
	}

	// login
	async login() {
		const { request, PASSWORD, STORE, SHA256 } = this.utils;
		const { password } = await GetReqJson(request);
		if (password === PASSWORD) {
			const time = Date.now();
			const token = await SHA256(JSON.stringify([Math.random(), time]));
			const expires = time + 86400000;
			await STORE.put('token', JSON.stringify({ token, expires }));
			return this.createCookieResponse(0, 'Success', token, 'token', token, expires);
		}
		return this.createErrorResponse(1001, 'Password error.', 401);
	}

	// logout
	async logout() {
		const { STORE } = this.utils;
		await STORE.delete('token');
		return this.createCookieResponse(0, 'Success', null, 'token', '');
	}

	// generate a random slug
	async randomize() {
		return this.createSuccessResponse(await this.utils.Slug());
	}

	async check_slug() {
		const { request } = this.utils;
		const { slug } = await GetReqJson(request);
		const obj = await this.utils.ParseFirst(slug);
		return this.createResponse(
			obj.url ? 1040 : 0,
			obj.url ? 'Slug already exists.' : 'Success',
			!!obj.url
		);
	}

	// create or update a slug
	async save() {
		const { request, STORE, CheckURL } = this.utils;
		let body = await GetReqJson(request);
		let { url, slug, creation } = body;

		// check if url is valid
		if (!CheckURL(url)) {
			return this.createErrorResponse(1050, 'Invalid URL.');
		}

		// if slug is not provided, generate one
		slug = slug || (await this.utils.Slug());

		if (!creation) {
			// check if slug already exists
			const { url: existed } = await this.utils.ParseFirst(slug);
			if (existed) {
				return this.createErrorResponse(1051, 'Slug already exists.');
			}
		}

		// save url
		const { success, meta: details } = await STORE.put(slug, JSON.stringify(body));
		return this.createResponse(
			success ? 0 : 1052,
			success ? 'Success' : JSON.stringify(details),
			success ? slug : null
		);
	}

	// get all slugs
	async get() {
		const { request, STORE } = this.utils;
		const { rows, page, search, mode } = await GetReqJson(request);
		const { success, results } = await STORE.get({ rows, page });
		const count = await STORE.count({});
		
		let filteredResults = results;
		let filteredCount = count;
		
		// 如果有搜索关键词，进行过滤
		if (search && search.trim()) {
			const searchTerm = search.trim().toLowerCase();
			filteredResults = results.filter(item => {
				let value = {};
				try {
					value = JSON.parse(item.value);
				} catch (e) {
					console.log(e);
				}
				
				// 搜索短网址（key）、源网址（url）、显示名称（displayName）和备注（notes）
				const shortUrl = item.key.toLowerCase();
				const originalUrl = (value.url || '').toLowerCase();
				const displayName = (value.displayName || '').toLowerCase();
				const notes = (value.notes || '').toLowerCase();
				
				return shortUrl.includes(searchTerm) || 
				       originalUrl.includes(searchTerm) || 
				       displayName.includes(searchTerm) || 
				       notes.includes(searchTerm);
			});
			filteredCount = filteredResults.length;
		}
		
		// 如果有模式筛选，进行过滤
		if (mode && mode !== 'all') {
			filteredResults = filteredResults.filter(item => {
				let value = {};
				try {
					value = JSON.parse(item.value);
				} catch (e) {
					console.log(e);
				}
				
				// 根据跳转模式进行筛选
				return value.mode === mode;
			});
			filteredCount = filteredResults.length;
		}
		
		// 直接返回数据库中的结果，点击数已经通过Counter函数保持最新
		return this.createResponse(
			success ? 0 : 1052,
			'Success',
			{ results: filteredResults, count: filteredCount, rows, page }
		);
	}

	// delete a slug
	async delete() {
		const { request, STORE } = this.utils;
		let body = await GetReqJson(request);
		let { slug } = body;
		const { success, meta: details } = await STORE.delete(slug);
		return this.createResponse(
			success ? 0 : 1060,
			success ? 'Success' : JSON.stringify(details),
			null
		);
	}

	// validate passcode for protected slug
	async sesame() {
		const { request } = this.utils;
		const { slug, passcode } = await GetReqJson(request);
		
		if (!slug) {
			return this.createErrorResponse(1070, 'Slug is required.');
		}
		
		const obj = await this.utils.ParseFirst(slug);
		if (!obj.url) {
			return this.createErrorResponse(1071, 'Slug not found.');
		}
		
		// Check if passcode is required and matches
		if (obj.passcode && obj.passcode !== passcode) {
			return this.createErrorResponse(1072, 'Invalid passcode.');
		}
		
		// If no passcode required or passcode matches, return success with URL data
		return this.createSuccessResponse({
			url: obj.url,
			mode: obj.mode || 'redirect',
			notes: obj.notes || ''
		});
	}
}

// Export Hono API routes as well for potential future use
export const apiRoutes = api;