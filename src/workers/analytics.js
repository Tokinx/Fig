const DEFAULT_TOP_LIMIT = 5;
const DEFAULT_GEO_LIMIT = 12;
const DEFAULT_RANGE_PRESET = "30d";
const VISIT_EVENT = "visit";
const VISITOR_COOKIE_NAME = "fig_vid";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const GEO_ENABLED_FLAG = "1";
const RANGE_PRESET_DAYS = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function escapeSqlString(value) {
  return String(value ?? "").replace(/'/g, "''");
}

function sanitizeIdentifier(value) {
  if (!/^[A-Za-z0-9_]+$/.test(String(value ?? ""))) {
    throw new Error("Invalid Analytics Engine dataset identifier.");
  }
  return value;
}

function normalizeCount(value) {
  return Number(value || 0);
}

function normalizeBreakdownLabel(value) {
  const label = String(value ?? "").trim();
  return !label || label.toLowerCase() === "unknown" ? "unknown" : label;
}

function mergeBreakdownRows(rows, limit = DEFAULT_TOP_LIMIT) {
  const merged = new Map();

  for (const row of rows || []) {
    const visits = normalizeCount(row?.visits);
    if (visits <= 0) continue;

    const label = normalizeBreakdownLabel(row?.label);
    const current = merged.get(label) || { label, visits: 0 };
    current.visits += visits;
    merged.set(label, current);
  }

  return Array.from(merged.values())
    .sort((left, right) => right.visits - left.visits || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function parseCookie(cookieHeader, key) {
  const prefix = `${key}=`;
  const pair = String(cookieHeader || "")
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  if (!pair) return "";

  try {
    return decodeURIComponent(pair.slice(prefix.length));
  } catch {
    return pair.slice(prefix.length);
  }
}

function normalizeCoordinate(value) {
  const coordinate = Number.parseFloat(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function startOfUtcDay(date) {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

function addUtcDays(date, days) {
  const normalized = startOfUtcDay(date);
  normalized.setUTCDate(normalized.getUTCDate() + days);
  return normalized;
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatSqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function parseDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return null;
  }

  const [year, month, day] = String(value).split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function serializeRange(range) {
  return {
    preset: range.preset,
    startDate: range.startDate,
    endDate: range.endDate,
    days: range.days,
  };
}

function resolveRange({ preset, startDate, endDate } = {}) {
  // 月份预设：m0 = 当月, m1 = 上月, m2 = 上上月, m3 = 三个月前
  if (preset && preset.startsWith("m")) {
    const monthOffset = parseInt(preset.slice(1), 10);
    if (!isNaN(monthOffset) && monthOffset >= 0) {
      const today = startOfUtcDay(new Date());
      const targetDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthOffset, 1));
      const startAt = targetDate;
      const endAt = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0)); // 月末
      const days = Math.floor((endAt.getTime() - startAt.getTime()) / 86400000) + 1;

      return {
        preset,
        startDate: formatDateKey(startAt),
        endDate: formatDateKey(endAt),
        days,
        startAt,
        endExclusive: addUtcDays(endAt, 1),
      };
    }
  }

  if (preset === "custom" || startDate || endDate) {
    const parsedStart = parseDateKey(startDate);
    const parsedEnd = parseDateKey(endDate);

    if (!parsedStart || !parsedEnd) {
      throw new Error("Invalid custom date range.");
    }

    const sortedRange = parsedStart <= parsedEnd ? [parsedStart, parsedEnd] : [parsedEnd, parsedStart];
    const [rangeStart, rangeEnd] = sortedRange;
    const days = Math.floor((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;

    return {
      preset: "custom",
      startDate: formatDateKey(rangeStart),
      endDate: formatDateKey(rangeEnd),
      days,
      startAt: rangeStart,
      endExclusive: addUtcDays(rangeEnd, 1),
    };
  }

  const resolvedPreset = RANGE_PRESET_DAYS[preset] ? preset : DEFAULT_RANGE_PRESET;
  const days = RANGE_PRESET_DAYS[resolvedPreset];
  const today = startOfUtcDay(new Date());
  const startAt = addUtcDays(today, -(days - 1));

  return {
    preset: resolvedPreset,
    startDate: formatDateKey(startAt),
    endDate: formatDateKey(today),
    days,
    startAt,
    endExclusive: addUtcDays(today, 1),
  };
}

export default class AnalyticsService {
  request = {};
  env = {};
  visitorId = "";
  shouldPersistVisitorCookie = false;

  constructor(request, env) {
    this.request = request;
    this.env = env;
  }

  canWrite() {
    return typeof this.env?.ANALYTICS?.writeDataPoint === "function";
  }

  canQuery() {
    return Boolean(this.env?.CF_ACCOUNT_ID && this.env?.CF_API_TOKEN && this.env?.ANALYTICS_DATASET);
  }

  getDataset() {
    return sanitizeIdentifier(this.env.ANALYTICS_DATASET);
  }

  getApiUrl() {
    return `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/analytics_engine/sql`;
  }

  getCountry() {
    return this.request?.cf?.country || this.request?.headers?.get("cf-ipcountry") || "unknown";
  }

  getLatitude() {
    return normalizeCoordinate(this.request?.cf?.latitude);
  }

  getLongitude() {
    return normalizeCoordinate(this.request?.cf?.longitude);
  }

  hasGeoCoordinates() {
    return this.getLatitude() !== null && this.getLongitude() !== null;
  }

  getVisitorId() {
    if (this.visitorId) {
      return this.visitorId;
    }

    const existing = parseCookie(this.request?.headers?.get("cookie"), VISITOR_COOKIE_NAME);
    if (existing) {
      this.visitorId = existing;
      this.shouldPersistVisitorCookie = false;
      return this.visitorId;
    }

    this.visitorId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    this.shouldPersistVisitorCookie = true;
    return this.visitorId;
  }

  getVisitorCookieHeader() {
    if (!this.shouldPersistVisitorCookie) {
      return null;
    }

    const secure = this.request?.url?.startsWith("https://") ? "; Secure" : "";
    return `${VISITOR_COOKIE_NAME}=${encodeURIComponent(this.getVisitorId())}; Path=/; Max-Age=${VISITOR_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
  }

  getRefererHost() {
    const referer = this.request?.headers?.get("referer");
    if (!referer) return "direct";

    try {
      return new URL(referer).hostname || "direct";
    } catch {
      return "direct";
    }
  }

  getDeviceType() {
    const userAgent = (this.request?.headers?.get("user-agent") || "").toLowerCase();

    if (!userAgent) return "unknown";
    if (/bot|crawler|spider|curl|wget|uptime|monitor/.test(userAgent)) return "bot";
    if (/ipad|tablet|playbook|silk/.test(userAgent)) return "tablet";
    if (/mobi|iphone|android|phone/.test(userAgent)) return "mobile";
    return "desktop";
  }

  getClientIp() {
    return (
      this.request?.headers?.get("cf-connecting-ip") ||
      this.request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  }

  getOs() {
    const ua = this.request?.headers?.get("user-agent") || "";
    if (/windows nt/i.test(ua)) return "Windows";
    if (/mac os x/i.test(ua)) return "macOS";
    if (/android/i.test(ua)) return "Android";
    if (/iphone|ipad/i.test(ua)) return "iOS";
    if (/linux/i.test(ua)) return "Linux";
    return "unknown";
  }

  getLanguage() {
    const lang = this.request?.headers?.get("accept-language") || "";
    return lang.split(",")[0]?.split(";")[0]?.trim() || "unknown";
  }

  getBrowser() {
    const ua = this.request?.headers?.get("user-agent") || "";
    if (/edg\//i.test(ua)) return "Edge";
    if (/opr\//i.test(ua)) return "Opera";
    if (/chrome\//i.test(ua)) return "Chrome";
    if (/safari\//i.test(ua) && !/chrome/i.test(ua)) return "Safari";
    if (/firefox\//i.test(ua)) return "Firefox";
    return "unknown";
  }

  writeVisit({ slug, mode = "redirect", eventType = VISIT_EVENT } = {}) {
    if (!this.canWrite() || !slug) return;

    try {
      const latitude = this.getLatitude();
      const longitude = this.getLongitude();

      this.env.ANALYTICS.writeDataPoint({
        indexes: [String(slug)],
        blobs: [
          String(eventType),
          String(mode || "redirect"),
          this.getCountry(),
          this.getRefererHost(),
          this.getDeviceType(),
          this.getVisitorId(),
          latitude !== null && longitude !== null ? GEO_ENABLED_FLAG : "",
          this.getClientIp(),
          this.getOs(),
          this.getLanguage(),
          this.getBrowser(),
        ],
        doubles: [latitude ?? 0, longitude ?? 0],
      });
    } catch (error) {
      console.error("Failed to write analytics datapoint:", error);
    }
  }

  async query(sql) {
    if (!this.canQuery()) {
      return [];
    }

    const response = await fetch(this.getApiUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.CF_API_TOKEN}`,
        "Content-Type": "text/plain",
      },
      body: sql,
    });

    const rawText = await response.text();
    let payload = {};

    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch (error) {
      throw new Error(`Analytics query returned invalid JSON: ${rawText || error.message}`);
    }

    if (!response.ok || payload.success === false) {
      const message =
        payload?.errors?.map((item) => item.message).join("; ") ||
        payload?.messages?.map((item) => item.message).join("; ") ||
        rawText ||
        "Analytics query failed.";
      throw new Error(message);
    }

    return payload.data || payload.result || [];
  }

  buildVisitsWhere(slug, range, extraClauses = []) {
    return [
      `index1 = '${escapeSqlString(slug)}'`,
      `blob1 = '${VISIT_EVENT}'`,
      `timestamp >= toDateTime('${formatSqlDateTime(range.startAt)}')`,
      `timestamp < toDateTime('${formatSqlDateTime(range.endExclusive)}')`,
      ...extraClauses,
    ].join(" AND ");
  }

  async queryVisitsTotal(slug, range) {
    const rows = await this.query(
      `SELECT SUM(_sample_interval) AS visits FROM ${this.getDataset()} WHERE ${this.buildVisitsWhere(slug, range)}`,
    );
    return normalizeCount(rows?.[0]?.visits);
  }

  async queryUniqueVisitors(slug, range) {
    const rows = await this.query(
      [
        `SELECT COUNT(DISTINCT blob6) AS visitors`,
        `FROM ${this.getDataset()}`,
        `WHERE ${this.buildVisitsWhere(slug, range, ["blob6 != ''"])}`,
      ].join(" "),
    );
    return normalizeCount(rows?.[0]?.visitors);
  }

  async queryBreakdown(slug, field, range, limit = DEFAULT_TOP_LIMIT) {
    const rawLimit = Math.max(limit * 20, 100);
    const rows = await this.query(
      [
        `SELECT ${field} AS label, SUM(_sample_interval) AS visits`,
        `FROM ${this.getDataset()}`,
        `WHERE ${this.buildVisitsWhere(slug, range)}`,
        `GROUP BY label`,
        `ORDER BY visits DESC`,
        `LIMIT ${rawLimit}`,
      ].join(" "),
    );

    // 历史数据可能把缺失值写成空串/NULL，新数据则显式写入 "unknown"；这里统一合并。
    return mergeBreakdownRows(rows, limit);
  }

  async queryTimeline(slug, range) {
    const rows = await this.query(
      [
        `SELECT toStartOfDay(timestamp) AS bucket, SUM(_sample_interval) AS visits`,
        `FROM ${this.getDataset()}`,
        `WHERE ${this.buildVisitsWhere(slug, range)}`,
        `GROUP BY bucket`,
        `ORDER BY bucket ASC`,
      ].join(" "),
    );

    return rows.map((row) => ({
      bucket: row.bucket,
      visits: normalizeCount(row.visits),
    }));
  }

  async queryGeoPoints(slug, range, limit = DEFAULT_GEO_LIMIT) {
    const rows = await this.query(
      [
        `SELECT`,
        `blob3 AS label,`,
        `SUM(_sample_interval) AS visits,`,
        `SUM(_sample_interval * double1) / SUM(_sample_interval) AS latitude,`,
        `SUM(_sample_interval * double2) / SUM(_sample_interval) AS longitude`,
        `FROM ${this.getDataset()}`,
        `WHERE ${this.buildVisitsWhere(slug, range, [`blob7 = '${GEO_ENABLED_FLAG}'`])}`,
        `GROUP BY label`,
        `ORDER BY visits DESC`,
        `LIMIT ${limit}`,
      ].join(" "),
    );

    return rows
      .map((row) => ({
        label: row.label || "unknown",
        visits: normalizeCount(row.visits),
        latitude: normalizeCoordinate(row.latitude),
        longitude: normalizeCoordinate(row.longitude),
      }))
      .filter((row) => row.visits > 0 && row.latitude !== null && row.longitude !== null);
  }

  async getStats(slug, options = {}) {
    const range = resolveRange(options);

    if (!this.canQuery()) {
      return {
        enabled: false,
        range: serializeRange(range),
        summary: { totalVisits: 0, totalVisitors: 0 },
        timeline: [],
        countries: [],
        referrers: [],
        devices: [],
        geoPoints: [],
        ips: [],
        oses: [],
        languages: [],
        browsers: [],
      };
    }

    const [totalVisits, totalVisitors, timeline, countries, referrers, devices, geoPoints, ips, oses, languages, browsers] = await Promise.all([
      this.queryVisitsTotal(slug, range),
      this.queryUniqueVisitors(slug, range),
      this.queryTimeline(slug, range),
      this.queryBreakdown(slug, "blob3", range),
      this.queryBreakdown(slug, "blob4", range),
      this.queryBreakdown(slug, "blob5", range),
      this.queryGeoPoints(slug, range),
      this.queryBreakdown(slug, "blob8", range),
      this.queryBreakdown(slug, "blob9", range),
      this.queryBreakdown(slug, "blob10", range),
      this.queryBreakdown(slug, "blob11", range),
    ]);

    return {
      enabled: true,
      range: serializeRange(range),
      summary: { totalVisits, totalVisitors },
      timeline,
      countries,
      referrers,
      devices,
      geoPoints,
      ips,
      oses,
      languages,
      browsers,
    };
  }
}
