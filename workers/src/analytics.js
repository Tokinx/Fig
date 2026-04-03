const DEFAULT_TOP_LIMIT = 5;
const VISIT_EVENT = 'visit';

function escapeSqlString(value) {
	return String(value ?? '').replace(/'/g, "''");
}

function sanitizeIdentifier(value) {
	if (!/^[A-Za-z0-9_]+$/.test(String(value ?? ''))) {
		throw new Error('Invalid Analytics Engine dataset identifier.');
	}
	return value;
}

function normalizeCount(value) {
	return Number(value || 0);
}

export default class AnalyticsService {
	request = {};
	env = {};

	constructor(request, env) {
		this.request = request;
		this.env = env;
	}

	canWrite() {
		return typeof this.env?.ANALYTICS?.writeDataPoint === 'function';
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
		return this.request?.cf?.country || this.request?.headers?.get('cf-ipcountry') || 'unknown';
	}

	getRefererHost() {
		const referer = this.request?.headers?.get('referer');
		if (!referer) return 'direct';

		try {
			return new URL(referer).hostname || 'direct';
		} catch {
			return 'direct';
		}
	}

	getDeviceType() {
		const userAgent = (this.request?.headers?.get('user-agent') || '').toLowerCase();

		if (!userAgent) return 'unknown';
		if (/bot|crawler|spider|curl|wget|uptime|monitor/.test(userAgent)) return 'bot';
		if (/ipad|tablet|playbook|silk/.test(userAgent)) return 'tablet';
		if (/mobi|iphone|android|phone/.test(userAgent)) return 'mobile';
		return 'desktop';
	}

	writeVisit({ slug, mode = 'redirect', eventType = VISIT_EVENT } = {}) {
		if (!this.canWrite() || !slug) return;

		try {
			this.env.ANALYTICS.writeDataPoint({
				indexes: [String(slug)],
				blobs: [
					String(eventType),
					String(mode || 'redirect'),
					this.getCountry(),
					this.getRefererHost(),
					this.getDeviceType(),
				],
				doubles: [1],
			});
		} catch (error) {
			console.error('Failed to write analytics datapoint:', error);
		}
	}

	async query(sql) {
		if (!this.canQuery()) {
			return [];
		}

		const response = await fetch(this.getApiUrl(), {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.env.CF_API_TOKEN}`,
				'Content-Type': 'text/plain',
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
				payload?.errors?.map((item) => item.message).join('; ') ||
				payload?.messages?.map((item) => item.message).join('; ') ||
				rawText ||
				'Analytics query failed.';
			throw new Error(message);
		}

		return payload.data || payload.result || [];
	}

	buildVisitsWhere(slug, intervalExpression = "'90' DAY") {
		return [
			`index1 = '${escapeSqlString(slug)}'`,
			`blob1 = '${VISIT_EVENT}'`,
			`timestamp >= NOW() - INTERVAL ${intervalExpression}`,
		].join(' AND ');
	}

	async queryVisitsTotal(slug, intervalExpression) {
		const rows = await this.query(
			`SELECT SUM(_sample_interval) AS visits FROM ${this.getDataset()} WHERE ${this.buildVisitsWhere(slug, intervalExpression)}`
		);
		return normalizeCount(rows?.[0]?.visits);
	}

	async queryBreakdown(slug, field, intervalExpression = "'90' DAY", limit = DEFAULT_TOP_LIMIT) {
		const rows = await this.query(
			[
				`SELECT ${field} AS label, SUM(_sample_interval) AS visits`,
				`FROM ${this.getDataset()}`,
				`WHERE ${this.buildVisitsWhere(slug, intervalExpression)}`,
				`GROUP BY label`,
				`ORDER BY visits DESC`,
				`LIMIT ${limit}`,
			].join(' ')
		);

		return rows
			.map((row) => ({
				label: row.label || 'unknown',
				visits: normalizeCount(row.visits),
			}))
			.filter((row) => row.visits > 0);
	}

	async getStats(slug) {
		if (!this.canQuery()) {
			return {
				enabled: false,
				summary: { last24h: 0, last7d: 0, last30d: 0, last90d: 0 },
				timeline: [],
				countries: [],
				referrers: [],
				devices: [],
			};
		}

		const [last24h, last7d, last30d, last90d, timelineRows, countries, referrers, devices] = await Promise.all([
			this.queryVisitsTotal(slug, "'24' HOUR"),
			this.queryVisitsTotal(slug, "'7' DAY"),
			this.queryVisitsTotal(slug, "'30' DAY"),
			this.queryVisitsTotal(slug, "'90' DAY"),
			this.query(
				[
					`SELECT toStartOfDay(timestamp) AS bucket, SUM(_sample_interval) AS visits`,
					`FROM ${this.getDataset()}`,
					`WHERE ${this.buildVisitsWhere(slug, "'90' DAY")}`,
					`GROUP BY bucket`,
					`ORDER BY bucket ASC`,
				].join(' ')
			),
			this.queryBreakdown(slug, 'blob3'),
			this.queryBreakdown(slug, 'blob4'),
			this.queryBreakdown(slug, 'blob5'),
		]);

		return {
			enabled: true,
			summary: { last24h, last7d, last30d, last90d },
			timeline: timelineRows.map((row) => ({
				bucket: row.bucket,
				visits: normalizeCount(row.visits),
			})),
			countries,
			referrers,
			devices,
		};
	}
}
