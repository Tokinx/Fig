import Utils from './utils.js';
import ControllerAPI from './api.js';

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const utils = new Utils(request, env);
		const api = new ControllerAPI(utils);
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
				const DynamicCode = '';

				// if shorten is a valid short url, redirect to it
				if (!unAuth.router(path) && shorten.length >= 6 && shorten.length <= 24) {
					const short = await utils.ParseFirst(shorten);
					if (short.url) {
						switch (short.mode) {
							case 'redirect':
								return Response.redirect(short.url, 302);
							case 'proxy':
								const proxy = await fetch(short.url);
								return new Response(await proxy.text(), {
									headers: { 'Content-Type': 'text/html;charset=UTF-8' },
								});
							case 'remind':
							case 'cloaking':
								DynamicCode = `window.__PAGE__ = '${short.mode}'; window.__URL__ = '${short.url}';`;
							default:
								if (short.safety === 'password') {
									DynamicCode = `window.__PAGE__ = '${short.safety}';`;
								}
						}
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

				const result = await fetch(`${env.THEME}/index.html`);
				const html = (await result.text()).replace('/* DynamicCode */', DynamicCode);
				return new Response(html, {
					headers: { 'Content-Type': 'text/html;charset=UTF-8' },
				});
		}
	},
};
