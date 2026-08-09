// 全量列表缓存验证脚本
// 验证:全量下发(full:true)、缓存一致性、创建/更新/删除后的缓存刷新、保留 key 拦截
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

// 1. 首次 get → 全量下发
let r = await api("get", {}, cookie);
check("get 返回全量模式 full=true", r.data?.full === true, JSON.stringify(r.data?.full));
check("全量 count = 51", r.data?.count === 51, JSON.stringify(r.data?.count));
check("results 长度 = 51(非分页)", r.data?.results?.length === 51, r.data?.results?.length);
const first = r.data?.results?.[0];
check("行含 key/createdAt/url 字段", !!first?.key && !!first?.createdAt && !!first?.url, JSON.stringify(first && Object.keys(first)));
check("按创建时间倒序", r.data?.results?.every((x, i, arr) => i === 0 || arr[i - 1].createdAt >= x.createdAt));

// 2. 再次 get(缓存命中，行为一致)
const r2 = await api("get", {}, cookie);
check("二次 get 结果一致", r2.data?.results?.[0]?.key === first?.key && r2.data?.count === 51);

// 3. 创建新链接 → 缓存失效并反映新数据
const newSlug = "cachetest" + Date.now().toString(36).slice(-4);
let r6 = await api("save", { url: "https://example.com/cache-test", slug: newSlug, mode: "redirect" }, cookie);
check("创建成功", r6.code === 0, r6.msg);
const r7 = await api("get", {}, cookie);
check("创建后 count = 52", r7.data?.count === 52, r7.data?.count);
check("新链接出现在全量列表", r7.data?.results?.some(x => x.key === newSlug));

// 4. 保留 key 拦截
const r8 = await api("save", { url: "https://example.com/x", slug: "_fig_cache_list", mode: "redirect" }, cookie);
check("_fig_ 前缀 slug 被拒绝", r8.code !== 0, r8.msg);
const r9 = await api("get", {}, cookie);
check("缓存行未出现在列表", !r9.data?.results?.some(x => x.key === "_fig_cache_list") && r9.data?.count === 52);

// 5. 更新已有链接 → 缓存刷新
const r10 = await api("save", { url: "https://example.com/updated", slug: newSlug, mode: "remind", creation: true }, cookie);
check("更新成功", r10.code === 0, r10.msg);
const r11 = await api("get", {}, cookie);
const updated = r11.data?.results?.find(x => x.key === newSlug);
check("更新后的 mode/url 生效", updated?.mode === "remind" && updated?.url === "https://example.com/updated", JSON.stringify(updated));

// 6. 删除 → 缓存刷新
const r12 = await api("delete", { slug: newSlug }, cookie);
check("删除成功", r12.code === 0, r12.msg);
const r13 = await api("get", {}, cookie);
check("删除后 count = 51", r13.data?.count === 51, r13.data?.count);
check("已删除链接不在列表", !r13.data?.results?.some(x => x.key === newSlug));

// 7. 阈值保护:全量模式下携带分页参数仍返回全量(参数被忽略)
const r14 = await api("get", { rows: 5, page: 1, search: "not-exist", mode: "proxy" }, cookie);
check("全量模式忽略筛选分页参数", r14.data?.full === true && r14.data?.count === 51, r14.data?.count);

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed ? 1 : 0);
