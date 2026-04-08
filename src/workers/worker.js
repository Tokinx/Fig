import { Hono } from "hono";
import { cors } from "hono/cors";
import Utils from "./utils.js";
import ControllerAPI from "./api.js";
import AnalyticsService from "./analytics.js";

const APP_ENTRY = "/";
const STATIC_ASSET_PREFIXES = ["/assets/", "/src/", "/@vite/", "/@id/", "/@fs/", "/node_modules/"];
const STATIC_ASSET_PATHS = new Set(["/favicon.svg", "/index.html"]);

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

const PROXY_REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const PROXY_HTML_REWRITE_ATTRS = ["href", "src", "action", "poster"];
const PROXY_REQUEST_HEADER_BLOCKLIST = new Set([
  "connection",
  "content-length",
  "cookie",
  "host",
  "x-real-ip",
]);

function shouldProxyRequestHeader(name) {
  const lowerName = name.toLowerCase();
  return (
    !PROXY_REQUEST_HEADER_BLOCKLIST.has(lowerName)
    && !lowerName.startsWith("cf-")
    && !lowerName.startsWith("x-forwarded-")
  );
}

function buildProxyRequestHeaders(sourceHeaders, upstreamUrl) {
  const headers = new Headers();

  for (const [name, value] of sourceHeaders.entries()) {
    if (!shouldProxyRequestHeader(name)) {
      continue;
    }
    headers.set(name, value);
  }

  if (headers.has("origin")) {
    headers.set("origin", upstreamUrl.origin);
  }

  if (headers.has("referer")) {
    headers.set("referer", `${upstreamUrl.origin}/`);
  }

  return headers;
}

function buildProxyPrefix(c, slug) {
  if (!slug) {
    return "";
  }
  const requestUrl = new URL(c.req.url);
  return `${requestUrl.origin}/${slug}`;
}

function resolveProxyUrlForHtml(rawValue, currentUpstreamUrl, proxyPrefix) {
  if (!rawValue) {
    return rawValue;
  }

  const value = rawValue.trim();
  if (
    !value
    || value.startsWith("#")
    || /^(data:|mailto:|tel:|javascript:|blob:)/i.test(value)
  ) {
    return rawValue;
  }

  try {
    const absoluteUrl = new URL(value, currentUpstreamUrl);
    if (proxyPrefix && absoluteUrl.origin === currentUpstreamUrl.origin) {
      return `${proxyPrefix}${absoluteUrl.pathname}${absoluteUrl.search}${absoluteUrl.hash}`;
    }
    return absoluteUrl.toString();
  } catch {
    return rawValue;
  }
}

function rewriteSrcsetValue(srcsetValue, currentUpstreamUrl, proxyPrefix) {
  return srcsetValue
    .split(",")
    .map((part) => {
      const trimmedPart = part.trim();
      if (!trimmedPart) {
        return trimmedPart;
      }

      const [candidateUrl, descriptor = ""] = trimmedPart.split(/\s+/, 2);
      const rewrittenUrl = resolveProxyUrlForHtml(candidateUrl, currentUpstreamUrl, proxyPrefix);
      return descriptor ? `${rewrittenUrl} ${descriptor}` : rewrittenUrl;
    })
    .join(", ");
}

function ensureProxyBaseTag(html, proxyBaseHref) {
  if (/<base\s/i.test(html)) {
    return html;
  }

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1><base href="${proxyBaseHref}">`);
  }

  return `<base href="${proxyBaseHref}">${html}`;
}

function rewriteHtmlForProxy(html, currentUpstreamUrl, proxyPrefix, shouldInjectBase) {
  let rewrittenHtml = html.replace(
    /\b(href|src|action|poster)\s*=\s*(["'])(.*?)\2/gi,
    (match, attrName, quote, value) => {
      if (!PROXY_HTML_REWRITE_ATTRS.includes(String(attrName).toLowerCase())) {
        return match;
      }

      const rewrittenValue = resolveProxyUrlForHtml(value, currentUpstreamUrl, proxyPrefix);
      return `${attrName}=${quote}${rewrittenValue}${quote}`;
    },
  );

  rewrittenHtml = rewrittenHtml.replace(/\bsrcset\s*=\s*(["'])(.*?)\1/gi, (match, quote, value) => {
    const rewrittenValue = rewriteSrcsetValue(value, currentUpstreamUrl, proxyPrefix);
    return `srcset=${quote}${rewrittenValue}${quote}`;
  });

  if (shouldInjectBase && proxyPrefix) {
    rewrittenHtml = ensureProxyBaseTag(rewrittenHtml, `${proxyPrefix}/`);
  }

  return rewrittenHtml;
}

function rewriteRedirectLocation(location, currentUpstreamUrl, proxyPrefix) {
  if (!location) {
    return location;
  }

  try {
    const absoluteUrl = new URL(location, currentUpstreamUrl);
    if (proxyPrefix && absoluteUrl.origin === currentUpstreamUrl.origin) {
      return `${proxyPrefix}${absoluteUrl.pathname}${absoluteUrl.search}${absoluteUrl.hash}`;
    }
    return absoluteUrl.toString();
  } catch {
    return location;
  }
}

function cleanProxyResponseHeaders(headers, { dropLocation = false } = {}) {
  const cleanHeaders = Utils.cleanProxyHeaders(headers);
  cleanHeaders.delete("set-cookie");
  if (dropLocation) {
    cleanHeaders.delete("location");
  }
  return cleanHeaders;
}

// Helper function to handle proxy requests
async function handleProxyRequest(c, targetUrl, slug = null) {
  const requestUrl = new URL(c.req.url);
  const upstreamUrl = new URL(targetUrl);
  const proxyPrefix = buildProxyPrefix(c, slug);
  const isRootProxyRequest = Boolean(slug) && requestUrl.pathname === `/${slug}`;

  for (const [key, value] of requestUrl.searchParams.entries()) {
    upstreamUrl.searchParams.set(key, value);
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: c.req.method,
      headers: buildProxyRequestHeaders(c.req.raw.headers, upstreamUrl),
      body: c.req.method === "GET" || c.req.method === "HEAD" ? undefined : c.req.raw.body,
      redirect: "manual",
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return c.text("Proxy target unreachable", 502);
  }

  if (PROXY_REDIRECT_STATUS_CODES.has(upstreamResponse.status)) {
    const headers = cleanProxyResponseHeaders(upstreamResponse.headers);
    const location = headers.get("location");
    if (location) {
      headers.set("location", rewriteRedirectLocation(location, upstreamUrl, proxyPrefix));
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  }

  const contentType = upstreamResponse.headers.get("Content-Type") || "";
  if (contentType.includes("text/html")) {
    const html = await upstreamResponse.text();
    const rewrittenHtml = rewriteHtmlForProxy(html, upstreamUrl, proxyPrefix, isRootProxyRequest);
    const headers = cleanProxyResponseHeaders(upstreamResponse.headers, { dropLocation: true });
    headers.set("content-type", contentType);

    return new Response(rewrittenHtml, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  }

  const headers = cleanProxyResponseHeaders(upstreamResponse.headers, { dropLocation: true });
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

function appendVisitorCookie(response, analytics) {
  const cookie = analytics?.getVisitorCookieHeader?.();
  if (!cookie) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
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

  let response;
  switch (mode) {
    case "redirect":
      response = c.redirect(targetUrl, 302);
      break;

    case "proxy":
      response = await handleProxyRequest(c, targetUrl, slug);
      break;

    case "remind":
    case "cloaking":
      const dynamicScript = Utils.createDynamicScript({
        template: short.mode,
        targetUrl,
        notes: short.notes,
      });
      response = await serveAppShell(c, { dynamicScript });
      break;

    default:
      response = c.redirect(targetUrl, 302);
      break;
  }

  return appendVisitorCookie(response, analytics);
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
app.all("/:slug", authMiddleware, async (c) => {
  const slug = c.req.param("slug");
  return await handleShortUrl(c, slug);
});

// 短网址子路径 (catch-all - must be last)
app.all("/:slug/*", authMiddleware, async (c) => {
  const slug = c.req.param("slug");
  const additionalPath = c.req.path.replace(`/${slug}`, "");
  return await handleShortUrl(c, slug, additionalPath);
});

export default app;
