// 创建 50 条短链接测试数据脚本
// 用法: node scripts/seed-test-data.mjs
// 通过 API 登录后调用 save 接口批量创建
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "http://127.0.0.1:8787";

// 从 .dev.vars 读取本地密码
function loadPassword() {
  const content = readFileSync(resolve(process.cwd(), ".dev.vars"), "utf8");
  const match = content.match(/^\s*PASSWORD\s*=\s*(.+)$/m);
  if (!match) throw new Error("无法从 .dev.vars 读取 PASSWORD");
  return match[1].trim();
}

// 生成随机 slug(与后端 SLUG_LENGTH=5 保持一致)
function randomSlug(len = 5) {
  const seed = "QWERTYUIOPASDFGHJKLZXCVBNM1234567890qwertyuiopasdfghjklzxcvbnm";
  let slug = "";
  for (let i = 0; i < len; i++) {
    slug += seed.charAt(Math.floor(Math.random() * seed.length));
  }
  return slug;
}

const SITES = [
  { url: "https://github.com", name: "GitHub" },
  { url: "https://www.google.com", name: "Google" },
  { url: "https://www.bing.com", name: "Bing" },
  { url: "https://www.wikipedia.org", name: "Wikipedia" },
  { url: "https://stackoverflow.com", name: "Stack Overflow" },
  { url: "https://developer.mozilla.org", name: "MDN Web Docs" },
  { url: "https://www.zhihu.com", name: "知乎" },
  { url: "https://www.bilibili.com", name: "哔哩哔哩" },
  { url: "https://juejin.cn", name: "掘金" },
  { url: "https://news.ycombinator.com", name: "Hacker News" },
  { url: "https://www.reddit.com", name: "Reddit" },
  { url: "https://www.producthunt.com", name: "Product Hunt" },
  { url: "https://dribbble.com", name: "Dribbble" },
  { url: "https://www.behance.net", name: "Behance" },
  { url: "https://www.figma.com", name: "Figma" },
  { url: "https://vercel.com", name: "Vercel" },
  { url: "https://www.cloudflare.com", name: "Cloudflare" },
  { url: "https://www.npmjs.com", name: "npm" },
  { url: "https://nodejs.org", name: "Node.js" },
  { url: "https://vuejs.org", name: "Vue.js" },
  { url: "https://react.dev", name: "React" },
  { url: "https://www.typescriptlang.org", name: "TypeScript" },
  { url: "https://tailwindcss.com", name: "Tailwind CSS" },
  { url: "https://www.docker.com", name: "Docker" },
  { url: "https://kubernetes.io", name: "Kubernetes" },
];

const PATHS = [
  "",
  "/docs",
  "/blog",
  "/docs/getting-started",
  "/docs/installation",
  "/changelog",
  "/roadmap",
  "/pricing",
  "/about",
  "/community",
  "/docs/api",
  "/docs/guide",
  "/tutorials",
  "/showcase",
  "/blog/hello-world",
  "/download",
  "/quickstart",
  "/learn",
  "/examples",
  "/search?q=shorten+url",
];

const MODES = ["redirect", "remind", "cloaking", "proxy"];
const NOTES = [
  "测试数据：内部文档入口",
  "市场活动落地页",
  "临时分享链接",
  "示例项目仓库",
  "",
  "仅供内部测试使用",
  "对外推广物料",
  "演示用短链接",
  "",
  "重要：请勿修改此链接",
];

const DISPLAY_PREFIXES = ["测试", "示例", "Demo", "Internal", "Marketing", "Docs", "Product", "Dev", "Tmp", "Links"];

function buildRecord(index) {
  const site = SITES[index % SITES.length];
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const mode = MODES[Math.floor(Math.random() * MODES.length)];
  const notes = NOTES[Math.floor(Math.random() * NOTES.length)];

  const record = {
    url: site.url + path,
    slug: randomSlug(),
    displayName: `${DISPLAY_PREFIXES[Math.floor(Math.random() * DISPLAY_PREFIXES.length)]} - ${site.name}`,
    notes,
    mode,
    passcode: "",
  };

  // 约 1/10 的链接设置访问密码
  if (index % 10 === 0) {
    record.passcode = `pass${1000 + index}`;
    record.mode = "redirect";
  }

  return record;
}

async function request(pathname, body, cookie = "") {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, ...data };
}

async function main() {
  const password = loadPassword();

  // 1. 登录获取 token
  const login = await request("/api/?action=login", { password });
  if (login.code !== 0 || !login.data) {
    console.error("登录失败:", login);
    process.exit(1);
  }
  const cookie = `token=${login.data}`;
  console.log("登录成功 ✓");

  // 2. 查询当前已有数量
  const existing = await request("/api/?action=get", { rows: 1, page: 1 }, cookie);
  const countBefore = existing.data?.count ?? 0;
  console.log(`当前已有短链接: ${countBefore} 条`);

  // 3. 批量创建 50 条
  const created = [];
  let failed = 0;
  for (let i = 0; i < 50; i++) {
    const record = buildRecord(i);
    const result = await request("/api/?action=save", record, cookie);
    if (result.code === 0) {
      created.push(result.data);
    } else {
      failed++;
      console.error(`  ✗ 第 ${i + 1} 条创建失败: ${result.msg}`);
    }
  }

  console.log(`\n创建成功: ${created.length} 条,失败: ${failed} 条`);
  console.log("示例 slug:", created.slice(0, 5).join(", "));

  // 4. 验证总数
  const after = await request("/api/?action=get", { rows: 1, page: 1 }, cookie);
  console.log(`创建后短链接总数: ${after.data?.count ?? 0} 条`);
}

main().catch((error) => {
  console.error("脚本执行出错:", error);
  process.exit(1);
});
