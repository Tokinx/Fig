import { Hono } from "hono";
import { cors } from "hono/cors";
import Utils from "./utils.js";
import ControllerAPI from "./api.js";
import AnalyticsService from "./analytics.js";

const APP_ENTRY = "/index.html";
const STATIC_ASSET_PREFIXES = ["/assets/", "/src/", "/@vite/", "/@id/", "/@fs/", "/node_modules/"];
const STATIC_ASSET_PATHS = new Set(["/favicon.svg"]);

const app = new Hono();

// Enable CORS
app.use("*", cors());

// Add utils and api to context
app.use("*", async (c, next) => {
  const utils = new Utils(c.req.raw, c.env);
  const analytics = new AnalyticsService(c.req.raw, c.env);
  const api = new ControllerAPI(utils, analytics);
  c.set("utils", utils);
  c.set("api", api);
  c.set("analytics", analytics);
  await next();
});

app.use("*", async (c, next) => {
  if (shouldServeFrontendAsset(c.req.path)) {
    return await serveFrontendAsset(c);
  }

  await next();
});

// Authentication middleware
const authMiddleware = async (c, next) => {
  console.log("API request:", c.req.method, c.req.path);
  const utils = c.get("utils");
  const { token: client } = await utils.Cookie();
  const { token, expires } = await utils.ParseFirst("token");
  const isLoggedIn = client === token && Date.now() <= expires;
  c.set("isLoggedIn", isLoggedIn);
  await next();
};

// API routes (must be before catch-all routes)
app.all("/api/*", authMiddleware, async (c) => {
  const action = c.req.query("action");
  const isLoggedIn = c.get("isLoggedIn");
  const api = c.get("api");

  // Actions that don't require authentication
  const publicActions = ["login", "logout", "sesame"];

  if (!publicActions.includes(action) && !isLoggedIn) {
    return c.json({ code: 1000, msg: "Invalid action.", data: null }, 404);
  }

  return await api.Gateway();
});

// Logout route
app.get("/logout", authMiddleware, async (c) => {
  const isLoggedIn = c.get("isLoggedIn");
  const api = c.get("api");

  if (isLoggedIn) {
    await api.logout();
  }
  return c.redirect("/");
});

// Root route
app.get("/", authMiddleware, async (c) => {
  const isLoggedIn = c.get("isLoggedIn");

  if (isLoggedIn) {
    return c.redirect("/manage");
  }

  return await serveAppShell(c);
});

// Manage route (protected) - 管理短链接页面
app.get("/manage", authMiddleware, async (c) => {
  const isLoggedIn = c.get("isLoggedIn");

  if (!isLoggedIn) {
    return c.redirect("/");
  }

  return await serveAppShell(c);
});

app.get("/manage/*", authMiddleware, async (c) => {
  return c.redirect("/manage");
});

app.get("/404", async (c) => {
  return await serveAppShell(c, { status: 404 });
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
  if (c.req.method !== "GET" && c.req.method !== "HEAD") {
    requestInit.body = c.req.raw.body;
  }

  const fetchResult = await Utils.fetchWithOptions(finalUrl.toString(), requestInit);

  if (!fetchResult.success) {
    console.error("Proxy error:", fetchResult.error);
    return c.text("Proxy target unreachable", 502);
  }

  // Handle HTML responses
  if (fetchResult.isHtml) {
    let html = await fetchResult.text();

    if (slug) {
      // For subpath proxy, update base href and fix relative links
      const baseUrl = targetUrl.replace(/\/[^/]*$/, "");
      html = html.replace("<head>", `<head><base href="${baseUrl}/">`);
      html = html.replace(/href="(?!http|\/\/|#)([^"]+)"/g, `href="/${slug}/$1"`);
      html = html.replace(/src="(?!http|\/\/|data:)([^"]+)"/g, `src="/${slug}/$1"`);
    } else {
      // For direct proxy, just add base tag
      html = html.replace("<head>", `<head><base href="${targetUrl}">`);
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
async function handleShortUrl(c, slug, additionalPath = "") {
  const utils = c.get("utils");
  const analytics = c.get("analytics");
  const short = await utils.ParseFirst(slug);

  if (!short.url) {
    return await serveAppShell(c, { status: 404 });
  }

  // Check if passcode is required
  if (short.passcode) {
    const dynamicScript = Utils.createDynamicScript({
      template: "passcode",
    });
    return await serveAppShell(c, { dynamicScript });
  }

  const targetUrl = Utils.buildUrlWithPath(short.url, additionalPath);
  const mode = short.mode || "redirect";

  if (!additionalPath) {
    analytics?.writeVisit({ slug, mode });
  }

  switch (mode) {
    case "redirect":
      return c.redirect(targetUrl, 302);

    case "proxy":
      return await handleProxyRequest(c, targetUrl, additionalPath ? slug : null);

    case "remind":
    case "cloaking":
      const dynamicScript = Utils.createDynamicScript({
        template: short.mode,
        targetUrl,
        notes: short.notes,
      });
      return await serveAppShell(c, { dynamicScript });

    default:
      return c.redirect(targetUrl, 302);
  }
}

function shouldServeFrontendAsset(pathname) {
  return STATIC_ASSET_PATHS.has(pathname) || STATIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function shouldProxyToDevServer(c) {
  const host = c.req.header("host") || "";
  return Boolean(c.env.FRONTEND_DEV_SERVER_URL) && /(localhost|127\.0\.0\.1)/.test(host);
}

function buildAssetRequest(c, pathname = c.req.path, search = "") {
  return new Request(new URL(`${pathname}${search}`, c.req.url), c.req.raw);
}

async function fetchFrontendResponse(c, pathname = c.req.path, search = "") {
  if (shouldProxyToDevServer(c)) {
    const assetUrl = new URL(`${pathname}${search}`, c.env.FRONTEND_DEV_SERVER_URL);
    return await fetch(assetUrl.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.method === "GET" || c.req.method === "HEAD" ? undefined : c.req.raw.body,
    });
  }

  return await c.env.ASSETS.fetch(buildAssetRequest(c, pathname, search));
}

function createAssetResponse(response, status = response.status) {
  return new Response(response.body, {
    status,
    headers: response.headers,
  });
}

async function serveFrontendAsset(c) {
  const requestUrl = new URL(c.req.url);
  const response = await fetchFrontendResponse(c, requestUrl.pathname, requestUrl.search);
  return createAssetResponse(response);
}

async function serveAppShell(c, { status = 200, dynamicScript = "" } = {}) {
  const response = await fetchFrontendResponse(c, APP_ENTRY);

  if (!response.ok) {
    console.error("Error serving app shell:", response.status, response.statusText);
    return c.text("Page not found", 404);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return createAssetResponse(response, status);
  }

  let html = await response.text();
  if (dynamicScript) {
    html = html.replace("/* DynamicScript */", dynamicScript);
  }

  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=UTF-8",
    },
  });
}

// 短网址 (catch-all - must be last)
app.get("/:slug", authMiddleware, async (c) => {
  const slug = c.req.param("slug");
  return await handleShortUrl(c, slug);
});

// 短网址子路径 (catch-all - must be last)
app.get("/:slug/*", authMiddleware, async (c) => {
  const slug = c.req.param("slug");
  const additionalPath = c.req.path.replace(`/${slug}`, "");
  return await handleShortUrl(c, slug, additionalPath);
});

export default app;
