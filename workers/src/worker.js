import Utils from './utils.js';
import Api from './api.js';

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const utils = new Utils(request, env);
		const api = new Api(utils);
		// remove trailing slash and duplicate slashes
		const path = `/${url.pathname}`.replace(/\/$/, '').replace(/\/{1,}/g, '/');

		const unAuth = {
			router: (x) => ['/', '/logout'].includes(x),
			action: (x) => ['login', 'logout'].includes(x),
		};
		const Authentication = async () => {
			const { token: client } = await utils.Cookie();
			const { token, expires } = await utils.ParseFirst('token');
			return client === token && Date.now() <= expires;
		};

		switch (path) {
			case '/api':
				const _action = url.searchParams.get('action');
				if (!unAuth.action(_action) && !(await Authentication())) {
					return Response.json({ code: 1002, msg: 'Authentication failed.', data: null }, { status: 401 });
				}
				return await api.Gateway();
			default:
				const shorten = path.replace(/\//gi, '');

				// if shorten is a valid short url, redirect to it
				if (!unAuth.router(path) && shorten.length >= 6 && shorten.length <= 24) {
					const short = await utils.ParseFirst(shorten);
					if (short.url) {
						return Response.redirect(short.url, 302);
					}
				}

				// if not logged in or preparing to logout, redirect to login
				if (path === '/logout' || (!unAuth.router(path) && !(await Authentication()))) {
					await api.logout();
					return Response.redirect(url.origin, 302);
				}

				// // if logged in, redirect to dashboard
				// if (["/"].includes(path)) {
				//   return Response.redirect(`${url.origin}/dash`, 302);
				// }
				return await utils.$static('index.html');
		}
	},
};
