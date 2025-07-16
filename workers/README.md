# Fig 短链接服务 - 后端 Workers

基于 Cloudflare Workers 构建的无服务器后端服务，提供 RESTful API 接口。

## 功能特性

- 🔐 JWT 认证系统
- 🔗 链接管理 CRUD 操作
- 📌 Pin 功能支持
- 📊 访问统计分析
- 🛡️ 中间件系统
- 🗄️ D1 数据库集成
- 📈 Analytics Engine 集成

## 技术栈

- **Cloudflare Workers** - 边缘计算平台
- **D1 Database** - 无服务器 SQLite 数据库
- **Analytics Engine** - 实时数据分析
- **KV Storage** - 键值存储 (缓存)

## 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 部署到 Cloudflare
npm run deploy

# 查看日志
npm run tail
```

## API 端点

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

### 链接管理
- `GET /api/links` - 获取链接列表
- `POST /api/links` - 创建链接
- `GET /api/links/:key` - 获取链接详情
- `PUT /api/links/:key` - 更新链接
- `DELETE /api/links/:key` - 删除链接

### Pin 功能
- `POST /api/links/:key/pin` - 固定链接到导航页
- `DELETE /api/links/:key/pin` - 取消固定

### 导航页
- `GET /api/navigation` - 获取导航页配置
- `PUT /api/navigation/order` - 更新导航页排序

### 统计分析
- `GET /api/analytics/:key` - 获取链接访问统计
- `GET /api/analytics/summary` - 获取总体统计

### 工具接口
- `GET /api/utils/preview` - URL 预览
- `POST /api/utils/validate` - URL 验证
- `GET /api/utils/random` - 生成随机短链接

## 数据库结构

### shorten 表
存储短链接信息，包含 Pin 功能相关字段。

### navigation_config 表
存储导航页配置信息。

### analytics 表
存储访问统计信息。

## 环境变量

在 `wrangler.toml` 中配置：

```toml
[vars]
ADMIN_PASSWORD = "your-admin-password"
JWT_SECRET = "your-jwt-secret"
DOMAIN = "your-domain.com"
```

## 部署

1. 设置 Cloudflare Workers 环境
2. 创建 D1 数据库
3. 配置环境变量
4. 运行 `npm run deploy`

## 数据库初始化

首次部署后，运行以下命令初始化数据库：

```bash
wrangler d1 execute fig-db --file=./schema.sql
```