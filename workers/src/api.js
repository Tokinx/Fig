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

	// generate a random shorten
	async randomize() {
		return Response.json({ code: 0, msg: 'Success', data: await this.utils.Shorten() }, { status: 200 });
	}

	async check_shorten() {
		const { request } = this.utils;
		const { shorten } = await GetReqJson(request);
		const obj = await this.utils.ParseFirst(shorten);
		return Response.json(
			{
				code: obj.url ? 1040 : 0,
				msg: obj.url ? 'Shorten already exists.' : 'Success',
				data: !!obj.url,
			},
			{ status: 200 }
		);
	}

	// create or update a shorten
	async save() {
		const { request, STORE, CheckURL } = this.utils;
		let body = await GetReqJson(request);
		let { url, shorten, creation } = body;

		// check if url is valid
		if (!(await CheckURL(url))) {
			return Response.json({ code: 1050, msg: 'Invalid URL.', data: null }, { status: 400 });
		}

		// if shorten is not provided, generate one
		shorten = shorten || (await this.utils.Shorten());

		if (!creation) {
			// check if shorten already exists
			const { url: existed } = await this.utils.ParseFirst(shorten);
			if (existed) {
				return Response.json({ code: 1051, msg: 'Shorten already exists.', data: null }, { status: 400 });
			}
		}

		// save url
		const { success, meta: details } = await STORE.put(shorten, JSON.stringify(body));
		return Response.json({
			code: 0,
			msg: success ? 'Success' : JSON.stringify(details),
			data: success ? shorten : null,
		});
	}

	// get all shortens
	async get() {
		const { request, STORE } = this.utils;
		const { rows, page } = await GetReqJson(request);
		const { success, results } = await STORE.get({ rows, page });
		const count = await STORE.count({});
		return Response.json({
			code: success ? 0 : 1052,
			msg: 'Success',
			data: { results, count, rows, page },
		});
	}

	// delete a shorten
	async delete() {
		const { request, STORE } = this.utils;
		let body = await GetReqJson(request);
		let { shorten } = body;
		const { success, meta: details } = await STORE.delete(shorten);
		return Response.json({
			code: success ? 0 : 1060,
			msg: success ? 'Success' : JSON.stringify(details),
			data: null,
		});
	}

	// sesame
	async sesame() {
		const { request } = this.utils;
		const { shorten, password } = await GetReqJson(request);
		const data = this.utils.ParseFirst(shorten);
		if (data.values.password === password) {
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
		return Response.json({ code: 1070, msg: 'Incorrect password', data: null }, { status: 401 });
	}
}
