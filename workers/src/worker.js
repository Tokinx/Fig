import Utils from './utils.js';
import ControllerAPI from './api.js';

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const utils = new Utils(request, env);
		const api = new ControllerAPI(utils);
		// remove trailing slash and duplicate slashes
		const path = `/${url.pathname}`.replace(/\/$/, '').replace(/\/{1,}/g, '/');
		// write data point
		utils.DataPoint(path);

		const _check = {
			// only logged user can access
			autRouter: (x) => ['/dash'].includes(x),
			anyRouter: (x) => ['/', '/logout'].includes(x),
			// can use api action without login
			anyAction: (x) => ['login', 'logout', 'sesame'].includes(x),
		};

		const Authentication = async () => {
			const { token: client } = await utils.Cookie();
			const { token, expires } = await utils.ParseFirst('token');
			return client === token && Date.now() <= expires;
		};
		const logon = await Authentication();

		switch (path) {
			case '/api':
				const _action = url.searchParams.get('action');
				if (!_check.anyAction(_action) && !logon) {
					return Response.json({ code: 1000, msg: 'Invalid action.', data: null }, { status: 404 });
				}
				return await api.Gateway();
			default:
				const shorten = path.replace(/\//gi, '');
				let DynamicCode = '';

				// if shorten is a valid short url, run it
				if (!_check.anyRouter(path) && !_check.autRouter(path)) {
					const short = await utils.ParseFirst(shorten);
					if (short.url) {
						const { number, expires } = short.values;
						const _excess = {
							clicks: number ? short.clicks >= number : false,
							expires: expires ? Date.now() >= new Date(expires).getTime() : false,
						};

						if (short.safety !== 'password') {
							DynamicCode = `window.__PAGE__ = '${short.safety}';`;
						} else if (_excess.clicks) {
							DynamicCode = `window.__PAGE__ = 'visit';`;
						} else if (_excess.expires) {
							DynamicCode = `window.__PAGE__ = 'expires';`;
						} else {
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
									break;
								default:
								// no anythings
							}
						}
					}
				}

				// if not logged in or preparing to logout, redirect to login
				if ((logon && path === '/logout') || (!logon && _check.autRouter(path))) {
					// only logged user can logout
					if (path === '/logout' && logon) await api.logout();
					return Response.redirect(url.origin, 302);
				}

				// if logged in, redirect to dashboard
				if (['/'].includes(path) && logon) {
					return Response.redirect(`${url.origin}/dash`, 302);
				}

				const result = await fetch(`${env.THEME}/index.html`);
				const html = (await result.text()).replace('/* DynamicCode */', DynamicCode);
				return new Response(html, {
					headers: { 'Content-Type': 'text/html;charset=UTF-8' },
				});
		}
	},
};
