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

// Helper function to handle proxy requests
async function handleProxyRequest(c, targetUrl, slug = null) {
	// Forward query parameters
	const searchParams = new URL(c.req.url).searchParams;
	const finalUrl = new URL(targetUrl);
	for (const [key, value] of searchParams) {
		finalUrl.searchParams.set(key, value);
	}

	// Create request with same method, headers, and body
	const requestInit = {
		method: c.req.method,
		headers: c.req.raw.headers,
	};

	// Add body for non-GET requests
	if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
		requestInit.body = c.req.raw.body;
	}

	const fetchResult = await Utils.fetchWithOptions(finalUrl.toString(), requestInit);
	
	if (!fetchResult.success) {
		console.error('Proxy error:', fetchResult.error);
		return c.text('Proxy target unreachable', 502);
	}
	
	// Handle HTML responses
	if (fetchResult.isHtml) {
		let html = await fetchResult.text();
		
		if (slug) {
			// For subpath proxy, update base href and fix relative links
			const baseUrl = targetUrl.replace(/\/[^/]*$/, '');
			html = html.replace('<head>', `<head><base href="${baseUrl}/">`);
			html = html.replace(/href="(?!http|\/\/|#)([^"]+)"/g, `href="/${slug}/$1"`);
			html = html.replace(/src="(?!http|\/\/|data:)([^"]+)"/g, `src="/${slug}/$1"`);
		} else {
			// For direct proxy, just add base tag
			html = html.replace('<head>', `<head><base href="${targetUrl}">`);
		}
		
		return c.html(html);
	}
	
	// Handle other content types
	const cleanHeaders = Utils.cleanProxyHeaders(fetchResult.response.headers);
	
	return new Response(fetchResult.response.body, {
		status: fetchResult.response.status,
		headers: cleanHeaders,
	});
}

// Helper function to handle short URL requests
async function handleShortUrl(c, slug, additionalPath = '') {
	const utils = c.get('utils');
	const short = await utils.ParseFirst(slug);

	if (!short.url) {
		return await servePage(c, '/404', 404);
	}

	const targetUrl = Utils.buildUrlWithPath(short.url, additionalPath);

	switch (short.mode) {
		case 'redirect':
			return c.redirect(targetUrl, 302);

		case 'proxy':
			return await handleProxyRequest(c, targetUrl, additionalPath ? slug : null);

		case 'remind':
		case 'cloaking':
			const dynamicScript = Utils.createDynamicScript(short.mode, targetUrl, short.notes);
			return await servePage(c, '/', 200, dynamicScript);

		default:
			return c.redirect(targetUrl, 302);
	}
}

// Helper function to serve pages
async function servePage(c, path, status = 200, dynamicScript = '') {
	let themeUrl = `${c.env.THEME}${(path.includes('@/pages/') ? path : '/index.html').replace(/^\/pages/, '')}`;

	// Development environment
	if (c.req.header('host')?.includes('localhost')) {
		themeUrl = `http://localhost:5173`;
	}

	const fetchResult = await Utils.fetchWithOptions(themeUrl);
	
	if (!fetchResult.success) {
		console.error('Error serving page:', fetchResult.error);
		return c.text('Page not found', 404);
	}

	// Handle HTML responses
	if (fetchResult.isHtml) {
		let html = await fetchResult.text();

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
	
	// Handle non-HTML responses
	return new Response(fetchResult.response.body, {
		status: fetchResult.response.status,
		headers: fetchResult.response.headers,
	});
}

// 加载页面静态资源
app.get('/pages/*', async (c) => {
	return await servePage(c, `@${c.req.path}`);
});

// 短网址 (catch-all - must be last)
app.get('/:slug', authMiddleware, async (c) => {
	const slug = c.req.param('slug');
	return await handleShortUrl(c, slug);
});

// 短网址子路径 (catch-all - must be last)
app.get('/:slug/*', authMiddleware, async (c) => {
	const slug = c.req.param('slug');
	const additionalPath = c.req.path.replace(`/${slug}`, '');
	return await handleShortUrl(c, slug, additionalPath);
});

export default app;
