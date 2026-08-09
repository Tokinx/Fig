import { Hono } from "hono";

const api = new Hono();

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function GetReqJson(request) {
  let data = {};
  try {
    const contentType = request.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      data = (await request.json()) || {};
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      data = Object.fromEntries(formData);
    }
  } catch (e) {
    console.error("Failed to parse request body:", e.message);
  }
  return data;
}

export default class ControllerAPI {
  utils = {};
  analytics = null;

  constructor(utils, analytics = null) {
    this.utils = utils;
    this.analytics = analytics;
  }

  // Response helper functions
  createResponse(code, msg, data = null, status = 200, headers = {}) {
    return Response.json({ code, msg, data }, { status, headers });
  }

  createErrorResponse(code, msg, status = 400) {
    return this.createResponse(code, msg, null, status);
  }

  createSuccessResponse(data = null, msg = "Success") {
    return this.createResponse(0, msg, data);
  }

  appendVisitorCookie(response) {
    const cookie = this.analytics?.getVisitorCookieHeader?.();
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

  createCookieResponse(code, msg, data, cookieName, cookieValue, expires = null) {
    const cookieString = expires
      ? `${cookieName}=${cookieValue}; path=/; expires=${new Date(expires).toUTCString()}`
      : `${cookieName}=${cookieValue}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    return this.createResponse(code, msg, data, 200, { "Set-Cookie": cookieString });
  }

  async Gateway() {
    const { request } = this.utils;
    const url = new URL(request.url);
    const action = String(url.searchParams.get("action"));
    if (!this[action]) {
      return this.createErrorResponse(1000, "Invalid action.", 404);
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
      const expires = time + (86400000 * 120); // 120 days
      await STORE.put("token", JSON.stringify({ token, expires }));
      return this.createCookieResponse(0, "Success", token, "token", token, expires);
    }
    return this.createErrorResponse(1001, "Password error.", 401);
  }

  // logout
  async logout() {
    const { STORE } = this.utils;
    await STORE.delete("token");
    return this.createCookieResponse(0, "Success", null, "token", "");
  }

  // generate a random slug
  async randomize() {
    return this.createSuccessResponse(await this.utils.Slug());
  }

  async check_slug() {
    const { request } = this.utils;
    const { slug } = await GetReqJson(request);
    const obj = await this.utils.ParseFirst(slug);
    return this.createResponse(obj.url ? 1040 : 0, obj.url ? "Slug already exists." : "Success", !!obj.url);
  }

  // create or update a slug
  async save() {
    const { request, STORE, CheckURL } = this.utils;
    let body = await GetReqJson(request);
    let { url, slug, creation } = body;

    // check if url is valid
    if (!CheckURL(url)) {
      return this.createErrorResponse(1050, "Invalid URL.");
    }

    // if slug is not provided, generate one
    slug = slug || (await this.utils.Slug());

    // 保留 key(_fig_ 开头)用于系统内部数据，不允许作为短链 slug
    if (slug.startsWith("_fig_")) {
      return this.createErrorResponse(1051, "Slug already exists.");
    }

    if (!creation) {
      // check if slug already exists
      const { url: existed } = await this.utils.ParseFirst(slug);
      if (existed) {
        return this.createErrorResponse(1051, "Slug already exists.");
      }
    }

    // save url
    const { success, meta: details } = await STORE.put(slug, JSON.stringify(body));
    if (success) {
      // 列表已变化，失效全量缓存
      await STORE.invalidateListCache();
    }
    return this.createResponse(
      success ? 0 : 1052,
      success ? "Success" : JSON.stringify(details),
      success ? slug : null,
    );
  }

  // 数据量超过该阈值时，列表改为后端按需分页下发，避免全量数据传给前端
  static MAX_FULL_LIST = 10000;

  // get all slugs
  async get() {
    const { request, STORE } = this.utils;

    // 从全量缓存读取(未命中时自动查询 D1 并写缓存)
    let list;
    try {
      list = await STORE.cachedList();
    } catch (error) {
      console.error("Failed to load cached list:", error);
      return this.createErrorResponse(1052, "Failed to load links.");
    }

    // 超过阈值：后端按需分页，前端退化为服务端分页模式
    if (list.length > ControllerAPI.MAX_FULL_LIST) {
      const { rows, page, search, mode } = await GetReqJson(request);
      const safeRows = normalizePositiveInteger(rows, 20);
      const safePage = normalizePositiveInteger(page, 1);
      const searchTerm = typeof search === "string" ? search.trim().toLowerCase() : "";
      const activeMode = typeof mode === "string" ? mode : "";

      // 内存过滤：与原有 SQL LIKE 逻辑等价(大小写不敏感子串匹配)
      let filtered = list;
      if (searchTerm) {
        filtered = filtered.filter(
          (x) =>
            (x.key || "").toLowerCase().includes(searchTerm) ||
            (x.url || "").toLowerCase().includes(searchTerm) ||
            (x.displayName || "").toLowerCase().includes(searchTerm) ||
            (x.notes || "").toLowerCase().includes(searchTerm),
        );
      }
      if (activeMode && activeMode !== "all") {
        filtered = filtered.filter((x) => x.mode === activeMode);
      }

      const count = filtered.length;
      const start = (safePage - 1) * safeRows;
      return this.createResponse(0, "Success", {
        results: filtered.slice(start, start + safeRows),
        count,
        rows: safeRows,
        page: safePage,
        full: false,
      });
    }

    // 数据量小：全量下发给前端，由前端本地完成搜索/筛选/分页
    return this.createSuccessResponse({
      results: list,
      count: list.length,
      rows: list.length,
      page: 1,
      full: true,
    });
  }

  async stats() {
    const { request } = this.utils;
    const { slug, preset, startDate, endDate, timezone } = await GetReqJson(request);

    if (!slug) {
      return this.createErrorResponse(1080, "Slug is required.");
    }

    const obj = await this.utils.ParseFirst(slug);
    if (!obj.url) {
      return this.createErrorResponse(1081, "Slug not found.", 404);
    }

    try {
      const data = await this.analytics?.getStats(slug, { preset, startDate, endDate, timezone });
      return this.createSuccessResponse(
        data || {
          enabled: false,
          range: { preset: preset || "30d", startDate: "", endDate: "", days: 0 },
          summary: { totalVisits: 0, totalVisitors: 0 },
          timeline: [],
          countries: [],
          referrers: [],
          devices: [],
          geoPoints: [],
        },
      );
    } catch (error) {
      console.error("Failed to query analytics stats:", error);
      if (error.message === "Invalid custom date range.") {
        return this.createErrorResponse(1082, error.message, 400);
      }
      const detail = error?.message ? `: ${error.message}` : "";
      return this.createErrorResponse(1082, `Failed to load analytics stats${detail}`, 500);
    }
  }

  // delete a slug
  async delete() {
    const { request, STORE } = this.utils;
    let body = await GetReqJson(request);
    let { slug } = body;
    const { success, meta: details } = await STORE.delete(slug);
    if (success) {
      // 列表已变化，失效全量缓存
      await STORE.invalidateListCache();
    }
    return this.createResponse(success ? 0 : 1060, success ? "Success" : JSON.stringify(details), null);
  }

  // validate passcode for protected slug
  async sesame() {
    const { request } = this.utils;
    const { slug, passcode } = await GetReqJson(request);

    if (!slug) {
      return this.createErrorResponse(1070, "Slug is required.");
    }

    const obj = await this.utils.ParseFirst(slug);
    if (!obj.url) {
      return this.createErrorResponse(1071, "Slug not found.");
    }

    // Check if passcode is required and matches
    if (obj.passcode && obj.passcode !== passcode) {
      return this.createErrorResponse(1072, "Invalid passcode.");
    }

    this.analytics?.writeVisit({ slug, mode: obj.mode || "redirect" });

    // If no passcode required or passcode matches, return success with URL data
    return this.appendVisitorCookie(
      this.createSuccessResponse({
        url: obj.url,
        mode: obj.mode || "redirect",
        // notes: obj.notes || ''
      }),
    );
  }
}

// Export Hono API routes as well for potential future use
export const apiRoutes = api;
