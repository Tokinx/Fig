# Fig 短链接服务系统 - 部署指南

这是一个完整的部署指南，帮助您快速部署 Fig 短链接服务系统。

## 系统架构

- **前端**: Vue 3 + Vite + TailwindCSS + Radix Vue
- **后端**: Cloudflare Workers + D1 Database
- **部署**: 前端部署到静态托管，后端部署到 Cloudflare Workers

## 前提条件

1. **Node.js 18+** 
2. **Cloudflare 账户** 
3. **Wrangler CLI** 工具

## 第一步：准备环境

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

## 第二步：部署后端服务

### 1. 创建 D1 数据库

```bash
cd workers
wrangler d1 create fig-db
```

记录返回的数据库 ID，更新 `wrangler.toml` 中的 `database_id`。

### 2. 创建 KV 命名空间

```bash
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "CACHE" --preview
```

更新 `wrangler.toml` 中的 KV 命名空间 ID。

### 3. 配置环境变量

编辑 `wrangler.toml` 文件：

```toml
name = "fig-workers"
main = "src/index.js"
compatibility_date = "2024-01-15"

[vars]
ADMIN_PASSWORD = "your-secure-password"
JWT_SECRET = "your-jwt-secret-key"
DOMAIN = "your-domain.com"

[[d1_databases]]
binding = "DB"
database_name = "fig-db"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

### 4. 初始化数据库

```bash
wrangler d1 execute fig-db --file=./schema.sql
```

### 5. 部署 Workers

```bash
npm install
wrangler deploy
```

部署成功后，记录 Workers 的 URL，格式类似：`https://fig-workers.your-subdomain.workers.dev`

## 第三步：部署前端应用

### 1. 配置 API 地址

编辑 `web/.env.production` 文件：

```env
VITE_API_URL=https://fig-workers.your-subdomain.workers.dev
```

### 2. 构建前端应用

```bash
cd web
npm install
npm run build
```

### 3. 部署到静态托管

您可以选择以下任一平台：

#### 选项 A: Cloudflare Pages

```bash
wrangler pages publish dist --project-name=fig-frontend
```

#### 选项 B: Vercel

```bash
npm install -g vercel
vercel --prod
```

#### 选项 C: Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

## 第四步：配置自定义域名（可选）

### 1. 后端域名

在 Cloudflare Workers 控制台中为您的 Worker 配置自定义域名。

### 2. 前端域名

在您选择的托管平台中配置自定义域名。

### 3. 更新 CORS 设置

编辑 `workers/src/middleware/cors.js`，更新允许的源地址：

```javascript
const allowedOrigins = [
  'https://your-frontend-domain.com',
  'http://localhost:3000' // 开发环境
]
```

重新部署 Workers。

## 第五步：验证部署

### 1. 访问前端应用

打开浏览器，访问您的前端域名。

### 2. 登录管理后台

使用您在 `wrangler.toml` 中设置的 `ADMIN_PASSWORD` 登录。

### 3. 测试功能

- 创建一个短链接
- 测试访问短链接
- 固定链接到导航页
- 验证拖拽排序功能

## 故障排除

### 常见问题

1. **CORS 错误**
   - 检查 `cors.js` 中的允许源设置
   - 确保前端域名已添加到允许列表

2. **数据库连接失败**
   - 验证 D1 数据库 ID 是否正确
   - 确保已运行数据库初始化脚本

3. **认证失败**
   - 检查 JWT_SECRET 是否正确设置
   - 确保密码与 ADMIN_PASSWORD 匹配

### 调试命令

```bash
# 查看 Workers 日志
wrangler tail

# 查看 D1 数据库内容
wrangler d1 execute fig-db --command="SELECT * FROM shorten LIMIT 10"

# 重新部署
wrangler deploy
```

## 监控和维护

### 1. 监控指标

在 Cloudflare 控制台中监控：
- Workers 请求数和响应时间
- D1 数据库查询性能
- 错误率和异常

### 2. 日志管理

使用 `wrangler tail` 实时查看日志：

```bash
wrangler tail --format=json
```

### 3. 数据备份

定期备份 D1 数据库：

```bash
wrangler d1 execute fig-db --command="SELECT * FROM shorten" --output=backup.json
```

## 更新部署

### 更新后端

```bash
cd workers
wrangler deploy
```

### 更新前端

```bash
cd web
npm run build
# 重新部署到您选择的平台
```

## 安全建议

1. **定期更新密码**：更改 `ADMIN_PASSWORD` 和 `JWT_SECRET`
2. **启用 HTTPS**：确保所有通信都使用 HTTPS
3. **监控访问**：定期检查访问日志
4. **限制访问**：在生产环境中限制管理后台访问

## 扩展配置

### 自定义样式

编辑 `web/src/assets/index.css` 来自定义界面样式。

### 添加域名限制

在 `workers/src/handlers/links.js` 中添加域名验证逻辑。

### 集成第三方服务

可以集成 Google Analytics、监控服务等。

---

如果您遇到任何问题，请参考项目文档或提交 Issue。