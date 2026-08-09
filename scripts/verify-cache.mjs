// 方案A 全量缓存改造验证脚本
// 用法: node scripts/verify-cache.mjs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "http://127.0.0.1:8787";

function loadPassword() {
  const content = readFileSync(resolve(process.cwd(), ".dev.vars"), "utf8");
  return content.match(/^\s*PASSWORD\s*=\s*(.+)$/m)[1].trim();
}

async function api(action, body, cookie) {
  const response = await fetch(`${BASE_URL}/api/?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  return await response.json();
}

let passed = 0, failed = 0;
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name} ${extra}`); }
}

const password = loadPassword();
const login = await api("login", { password });
const cookie = `token=${login.data}`;
console.log("登录:", login.code === 0 ? "成功" : "失败");

// 1. 首次 get → 触发缓存构建
let r = await api("get", { rows: 20, page: 1 }, cookie);
check("首次 get count = 51", r.data?.count === 51, JSON.stringify(r.data?.count));
check("首次 get 返回 20 行", r.data?.results?.length === 20, r.data?.results?.length);
const firstKey = r.data?.results?.[0]?.key;
check("行含 key/creation/url 字段", !!firstKey && r.data.results[0].creation && r.data.results[0].url);

// 2. 再次 get(缓存命中,行为应一致)
const r2 = await api("get", { rows: 20, page: 1 }, cookie);
check("二次 get 结果一致", r2.data?.results?.[0]?.key === firstKey && r2.data?.count === 51);

// 3. 分页
const r3 = await api("get", { rows: 20, page: 3 }, cookie);
check("第3页 count 仍为 51", r3.data?.count === 51);
check("第3页返回 11 行(51-40)", r3.data?.results?.length === 11, r3.data?.results?.length);

// 4. 搜索
const r4 = await api("get", { rows: 20, page: 1, search: "bilibili" }, cookie);
check("搜索 bilibili 命中 >=1", r4.data?.count >= 1 && r4.data?.results?.every(x => (x.url || "").toLowerCase().includes("bilibili") || (x.displayName || "").toLowerCase().includes("bilibili")), r4.data?.count);

// 5. 模式筛选
const r5 = await api("get", { rows: 20, page: 1, mode: "proxy" }, cookie);
check("筛选 proxy 全为 proxy", r5.data?.count >= 1 && r5.data?.results?.every(x => x.mode === "proxy"), r5.data?.count);

// 6. 创建新链接 → 缓存应失效并反映新数据
const newSlug = "cachetest" + Date.now().toString(36).slice(-4);
let r6 = await api("save", { url: "https://example.com/cache-test", slug: newSlug, mode: "redirect" }, cookie);
check("创建成功", r6.code === 0, r6.msg);
const r7 = await api("get", { rows: 20, page: 1 }, cookie);
check("创建后 count = 52", r7.data?.count === 52, r7.data?.count);
check("新链接出现在列表", r7.data?.results?.some(x => x.key === newSlug));

// 7. 保留 key 拦截
const r8 = await api("save", { url: "https://example.com/x", slug: "_fig_cache_list", mode: "redirect" }, cookie);
check("_fig_ 前缀 slug 被拒绝", r8.code !== 0, r8.msg);
const r9 = await api("get", { rows: 20, page: 1 }, cookie);
check("缓存行未出现在列表", !r9.data?.results?.some(x => x.key === "_fig_cache_list") && r9.data?.count === 52);

// 8. 更新已有链接 → 缓存刷新
const r10 = await api("save", { url: "https://example.com/updated", slug: newSlug, mode: "remind", creation: true }, cookie);
check("更新成功", r10.code === 0, r10.msg);
const r11 = await api("get", { rows: 20, page: 1, search: newSlug }, cookie);
check("更新后的 mode 生效", r11.data?.results?.[0]?.mode === "remind" && r11.data?.results?.[0]?.url === "https://example.com/updated");

// 9. 删除 → 缓存刷新
const r12 = await api("delete", { slug: newSlug }, cookie);
check("删除成功", r12.code === 0, r12.msg);
const r13 = await api("get", { rows: 20, page: 1 }, cookie);
check("删除后 count = 51", r13.data?.count === 51, r13.data?.count);
check("已删除链接不在列表", !r13.data?.results?.some(x => x.key === newSlug));

// 10. 搜索无结果
const r14 = await api("get", { rows: 20, page: 1, search: "zzzz-not-exist" }, cookie);
check("无结果搜索 count = 0", r14.data?.count === 0, r14.data?.count);

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed ? 1 : 0);
