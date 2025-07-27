import { Hono } from 'hono';

const api = new Hono();

async function GetReqJson(request) {
	let data = {};
	try {
		data = (await request.json()) || {};
	} catch (e) {
		console.log(e.message);
	}
	return data;
}

export default class ControllerAPI {
	utils = {};

	constructor(utils) {
		this.utils = utils;
	}

	async Gateway() {
		const { request } = this.utils;
		const url = new URL(request.url);
		const action = String(url.searchParams.get('action'));
		if (!this[action]) {
			return Response.json({ code: 1000, msg: 'Invalid action.', data: null }, { status: 404 });
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
			return Response.json(
				{ code: 0, msg: 'Success', data: token },
				{
					headers: {
						'Set-Cookie': `token=${token}; path=/; expires=${new Date(expires).toUTCString()}`,
					},
				}
			);
		}
		return Response.json({ code: 1001, msg: 'Password error.', data: null }, { status: 401 });
	}

	// logout
	async logout() {
		const { STORE } = this.utils;
		await STORE.delete('token');
		return Response.json(
			{ code: 0, msg: 'Success', data: null },
			{
				headers: {
					'Set-Cookie': `token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
				},
			}
		);
	}

	// generate a random slug
	async randomize() {
		return Response.json({ code: 0, msg: 'Success', data: await this.utils.Slug() }, { status: 200 });
	}

	async check_slug() {
		const { request } = this.utils;
		const { slug } = await GetReqJson(request);
		const obj = await this.utils.ParseFirst(slug);
		return Response.json(
			{
				code: obj.url ? 1040 : 0,
				msg: obj.url ? 'Slug already exists.' : 'Success',
				data: !!obj.url,
			},
			{ status: 200 }
		);
	}

	// create or update a slug
	async save() {
		const { request, STORE, CheckURL } = this.utils;
		let body = await GetReqJson(request);
		let { url, slug, creation } = body;

		// check if url is valid
		if (!(await CheckURL(url))) {
			return Response.json({ code: 1050, msg: 'Invalid URL.', data: null }, { status: 400 });
		}

		// if slug is not provided, generate one
		slug = slug || (await this.utils.Slug());

		if (!creation) {
			// check if slug already exists
			const { url: existed } = await this.utils.ParseFirst(slug);
			if (existed) {
				return Response.json({ code: 1051, msg: 'Slug already exists.', data: null }, { status: 400 });
			}
		}

		// save url
		const { success, meta: details } = await STORE.put(slug, JSON.stringify(body));
		return Response.json({
			code: 0,
			msg: success ? 'Success' : JSON.stringify(details),
			data: success ? slug : null,
		});
	}

	// get all slugs
	async get() {
		const { request, STORE } = this.utils;
		const { rows, page, search } = await GetReqJson(request);
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
		
		// 直接返回数据库中的结果，点击数已经通过Counter函数保持最新
		return Response.json({
			code: success ? 0 : 1052,
			msg: 'Success',
			data: { results: filteredResults, count: filteredCount, rows, page },
		});
	}

	// delete a slug
	async delete() {
		const { request, STORE } = this.utils;
		let body = await GetReqJson(request);
		let { slug } = body;
		const { success, meta: details } = await STORE.delete(slug);
		return Response.json({
			code: success ? 0 : 1060,
			msg: success ? 'Success' : JSON.stringify(details),
			data: null,
		});
	}

	// sesame
	async sesame() {
		const { request } = this.utils;
		const { slug, password } = await GetReqJson(request);
		const data = await this.utils.ParseFirst(slug);
		
		if (!data || !data.url) {
			return Response.json({ code: 1071, msg: 'Short link not found', data: null }, { status: 404 });
		}
		
		if (!data.values || data.values.password !== password) {
			return Response.json({ code: 1070, msg: 'Incorrect password', data: null }, { status: 401 });
		}
		
		return Response.json(
			{
				code: 0,
				msg: 'Success',
				data: {
					...data,
					// hide password
					values: { ...data.values, password: '******' },
				},
			},
			{ status: 200 }
		);
	}
}

// Export Hono API routes as well for potential future use
export const apiRoutes = api;