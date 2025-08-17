import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Utils from './utils.js';
import ControllerAPI from './api.js';

const app = new Hono();

// Enable CORS
app.use('*', cors());

// Add utils and api to context
app.use('*', async (c, next) => {
	const utils = new Utils(c.req.raw, c.env);
	const api = new ControllerAPI(utils);
	c.set('utils', utils);
	c.set('api', api);
	await next();
});

// Authentication middleware
const authMiddleware = async (c, next) => {
	console.log('API request:', c.req.method, c.req.path);
	const utils = c.get('utils');
	const { token: client } = await utils.Cookie();
	const { token, expires } = await utils.ParseFirst('token');
	const isLoggedIn = client === token && Date.now() <= expires;
	c.set('isLoggedIn', isLoggedIn);
	await next();
};

// API routes (must be before catch-all routes)
app.all('/api/*', authMiddleware, async (c) => {
	const action = c.req.query('action');
	const isLoggedIn = c.get('isLoggedIn');
	const api = c.get('api');

	// Actions that don't require authentication
	const publicActions = ['login', 'logout', 'sesame'];

	if (!publicActions.includes(action) && !isLoggedIn) {
		return c.json({ code: 1000, msg: 'Invalid action.', data: null }, 404);
	}

	return await api.Gateway();
});

// Logout route
app.get('/logout', authMiddleware, async (c) => {
	const isLoggedIn = c.get('isLoggedIn');
	const api = c.get('api');

	if (isLoggedIn) {
		await api.logout();
	}
	return c.redirect('/');
});

// Dashboard route (protected)
app.get('/dash', authMiddleware, async (c) => {
	const isLoggedIn = c.get('isLoggedIn');

	if (!isLoggedIn) {
		return c.redirect('/');
	}

	// Serve dashboard page
	return await servePage(c, '/dash');
});

// Root route
app.get('/', authMiddleware, async (c) => {
	const isLoggedIn = c.get('isLoggedIn');

	if (isLoggedIn) {
		return c.redirect('/dash');
	}

	// Serve login page
	return await servePage(c, '/');
});

// Helper function to serve pages
async function servePage(c, path, status = 200, dynamicScript = '') {
	if (path.includes('@/pages/')) {
	}
	let themeUrl = `${c.env.THEME}${(path.includes('@/pages/') ? path : '/index.html').replace(/^\/pages/, '')}`;

	// Development environment
	if (c.req.header('host')?.includes('localhost')) {
		themeUrl = `http://localhost:5173`;
	}

	try {
		const response = await fetch(themeUrl);

		// Inject base tag for HTML responses
		if (response.headers.get('Content-Type')?.includes('text/html')) {
			let html = await response.text();

			// Inject dynamic script
			if (dynamicScript) {
				html = html.replace('/* DynamicScript */', dynamicScript);
			}

			// Fix asset paths for localhost
			if (themeUrl.includes('localhost')) {
				html = html.replace(/(href|src)=\"\//gi, `$1="${themeUrl}/`);
			}
			return c.html(html);
		}
		return new Response(response.body, {
			status: response.status,
			headers: response.headers,
		});
	} catch (error) {
		console.error('Error serving page:', error);
		return c.text('Page not found', 404);
	}
}

// 加载页面静态资源
app.get('/pages/*', async (c) => {
	return await servePage(c, `@${c.req.path}`);
});

// 短网址 (catch-all - must be last)
app.get('/:slug', authMiddleware, async (c) => {
	const slug = c.req.param('slug');
	const utils = c.get('utils');

	// Check if this is a valid short URL
	const short = await utils.ParseFirst(slug);

	if (!short.url) {
		// Not a short URL, serve 404 page
		return await servePage(c, '/404', 404);
	}

	// Handle different modes
	switch (short.mode) {
		case 'redirect':
			return c.redirect(short.url, 302);

		case 'proxy':
			const url = new URL(short.url);
			url.pathname = url.pathname.replace(`/${slug}`, '');
			let response = await fetch(new Request(url));

			// Inject base tag for HTML responses
			if (response.headers.get('Content-Type')?.includes('text/html')) {
				const html = (await response.text()).replace(`<head>`, `<head><base href="${short.url}">`);
				return c.html(html);
			}
			return new Response(response.body, {
				status: response.status,
				headers: response.headers,
			});

		case 'remind':
		case 'cloaking':
			const DynamicScript = `window.__PAGE__ = '${short.mode}'; window.__URL__ = '${short.url}'; window.__NOTES__ = ${JSON.stringify(
				short.notes || ''
			)};`;
			// Serve the page with dynamic script
			return await servePage(c, '/', 200, DynamicScript);

		default:
			return c.redirect(short.url, 302);
	}
});

// Catch-all for short URLs with additional path segments
app.get('/:slug/*', authMiddleware, async (c) => {
	const slug = c.req.param('slug');
	const path = c.req.path.replace(`/${slug}`, '');
	const utils = c.get('utils');

	// Check if this is a valid short URL
	const short = await utils.ParseFirst(slug);

	if (!short.url) {
		// Not a short URL, serve 404 page
		return await servePage(c, '/404', 404);
	}

	// Serve the page with dynamic script
	return await servePage(c, short.url + path, 200, DynamicScript);
});

export default app;
