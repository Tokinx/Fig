# Fig - 短链接服务

基于 Vue 3 + Cloudflare Workers 构建的现代化短链接服务，支持自定义域名、密码保护、过期时间等高级功能。

## ✨ 核心功能

- **短链接生成** - 将长链接转换为简短易分享的链接，支持随机生成和自定义别名
- **自定义别名** - 支持自定义短链接后缀，便于记忆和品牌化
- **密码保护** - 为敏感链接设置访问密码，增强安全性
- **过期控制** - 设置链接的有效期，自动失效过期链接
- **访问统计** - 实时统计链接访问次数，支持 Analytics Engine 数据收集
- **高级搜索** - 支持按短网址、源网址、显示名称和备注进行搜索
- **链接管理** - 支持编辑、删除、批量管理短链接
- **响应式设计** - 基于 Tailwind CSS，完美适配桌面端和移动端
- **安全认证** - Cookie 基础的管理后台登录保护
- **多种模式** - 支持重定向、代理、密码验证、提醒等多种访问模式
- **现代化界面** - 基于 shadcn/vue 组件库，提供优雅的用户体验
- **无限滚动** - 支持大量短链接的无限滚动加载

## 🛠️ 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架，采用组合式 API
- **Vite** - 快速构建工具，提供极速的开发体验
- **Tailwind CSS** - 实用优先的 CSS 框架，快速构建美观界面
- **shadcn/vue** - 高质量 UI 组件库，基于 Radix Vue
- **Vue Router** - 官方路由管理器，支持 SPA 导航
- **VueUse** - Vue 组合式工具集
- **QRCode.js** - 二维码生成库
- **Vue3 Clipboard** - 剪贴板操作库

### 后端
- **Cloudflare Workers** - 边缘计算平台，全球分布式运行
- **Hono** - 轻量级、快速的 Web 框架
- **D1 Database** - Cloudflare 的 SQLite 数据库，提供持久化存储
- **Analytics Engine** - 实时数据分析和统计
- **Wrangler** - Cloudflare 开发和部署工具

### 开发工具
- **Bun** - 快速的 JavaScript 运行时和包管理器

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Bun (推荐) 或 npm/yarn
- Cloudflare 账户
- Git

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/Tokinx/Fig.git
cd Fig
```

2. **安装依赖并启动前端开发服务器**
```bash
cd web
bun install
bun dev
```

3. **安装依赖并启动后端开发服务器**
```bash
cd workers
bun install
# 配置 wrangler.toml 文件
bun dev
```

前端服务器运行在 `http://localhost:5173`，后端服务器运行在 `http://localhost:8787`。

### 构建部署

1. **构建前端**
```bash
cd web
bun run build
```
> 前端构建会自动清理并重新生成 `/pages/assets` 目录

2. **部署到 Cloudflare Workers**
```bash
cd workers
# 确保已配置好 wrangler.toml
bun run deploy
```

## ⚙️ 配置说明

### Cloudflare 配置

1. **创建 D1 数据库**
```bash
cd workers
wrangler d1 create shorten
```

2. **配置环境变量 (wrangler.toml)**
```toml
name = "short"
main = "src/worker.js"
compatibility_date = "2024-01-04"

[vars]
PASSWORD = "your-admin-password"    # 管理后台密码
THEME = "https://your-domain.com/pages"  # 主题资源 URL

[[d1_databases]]
binding = "SQLITE"
database_name = "shorten"
database_id = "your-database-id"    # 从创建 D1 数据库的输出中获取
```

3. **Analytics Engine 配置 (可选)**
```toml
[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "short_url_analytics"
```

## 📝 使用指南

### 创建短链接

1. 访问首页并使用管理员密码登录
2. 在仪表板中点击"创建短链接"按钮
3. 填写短链接信息：
   - **原始链接** - 要缩短的长链接 (必填)
   - **自定义别名** - 可选的短网址后缀，留空则自动生成
   - **显示名称** - 便于识别的显示名称
   - **模式选择**：
     - 重定向：直接跳转到目标链接 (默认)
     - 代理：通过代理访问目标网站
     - 密码验证：需要输入密码才能访问
     - 提醒页面：显示提醒信息后跳转
     - 伪装页面：显示自定义内容
   - **高级设置**：
     - 密码保护：为链接设置访问密码
     - 过期时间：设置链接有效期
     - 最大访问次数：限制访问次数
     - 备注信息：添加说明文字
4. 点击"创建"生成短链接

### 管理短链接

- **搜索功能** - 使用 `⌘ + K` 快捷键或搜索框，支持搜索短网址、源网址、显示名称和备注
- **查看统计** - 每个短链接卡片显示访问次数和创建时间
- **编辑链接** - 点击编辑按钮修改链接设置
- **删除链接** - 删除不需要的短链接
- **二维码** - 生成短链接的二维码用于分享
- **复制链接** - 一键复制短链接到剪贴板
- **无限滚动** - 自动加载更多链接，支持大量数据浏览

### 快捷键

- `⌘ + K` (Mac) / `Ctrl + K` (Windows) - 快速聚焦搜索框

## 🔧 开发指南

### 项目结构

```
Fig/
├── web/                    # 前端 Vue 3 项目
│   ├── src/
│   │   ├── components/     # Vue 组件
│   │   │   ├── ui/        # shadcn/vue UI 组件
│   │   │   └── Alert/     # 自定义提醒组件
│   │   ├── pages/         # 页面组件
│   │   │   ├── Home/      # 登录页面
│   │   │   ├── Dash/      # 仪表板页面
│   │   │   └── 404/       # 404 页面
│   │   ├── lib/           # 工具函数和配置
│   │   └── assets/        # 静态资源
│   ├── package.json       # 前端依赖配置
│   └── vite.config.js     # Vite 构建配置
├── workers/               # 后端 Cloudflare Workers 项目
│   ├── src/
│   │   ├── worker.js      # 主入口和路由处理
│   │   ├── api.js         # API 控制器和业务逻辑
│   │   └── utils.js       # 工具函数和数据库操作
│   ├── package.json       # 后端依赖配置
│   └── wrangler.toml      # Cloudflare Workers 配置
├── pages/                 # 前端构建输出目录 (自动生成)
│   ├── assets/           # 构建后的静态资源
│   └── index.html        # 入口 HTML 文件
└── CLAUDE.md             # Claude Code 项目配置
```

### API 接口

#### 认证相关
- `POST /api/?action=login` - 管理员登录
- `POST /api/?action=logout` - 退出登录

#### 短链接管理
- `POST /api/?action=save` - 创建/更新短链接
- `POST /api/?action=get` - 获取短链接列表 (支持搜索和分页)
- `POST /api/?action=delete` - 删除短链接
- `POST /api/?action=check_slug` - 检查短网址是否可用
- `POST /api/?action=randomize` - 生成随机短网址

#### 访问相关
- `POST /api/?action=sesame` - 密码验证短链接访问

### 可用命令

**前端开发 (./web)**
```bash
bun dev          # 启动开发服务器 (http://localhost:5173)
bun run build    # 构建生产版本 (输出到 ../pages/assets)
bun run preview  # 预览构建结果
```

**后端开发 (./workers)**
```bash
bun dev          # 启动本地开发 (http://localhost:8787)
bun run deploy   # 部署到 Cloudflare Workers
wrangler d1 create <name>  # 创建 D1 数据库
```

### 部署流程

1. **前端构建** - 运行 `bun run build` 会清理并重新生成 `/pages/assets` 目录
2. **配置 wrangler.toml** - 设置环境变量和数据库绑定
3. **部署 Workers** - 运行 `bun run deploy` 部署到 Cloudflare
4. **配置域名** - 在 Cloudflare 控制台配置自定义域名 (可选)

### 开发建议

- 使用 ESLint 和 Prettier 保持代码风格一致
- 前端组件遵循 shadcn/vue 组件模式
- API 接口采用 RESTful 设计原则
- 数据库操作通过 Utils 类统一管理
- 使用 TypeScript 提供更好的类型安全 (可选升级)

## 🔒 安全特性

- **认证机制** - 基于 Cookie 的安全认证
- **密码保护** - 敏感链接支持密码访问控制
- **访问限制** - 支持访问次数和过期时间限制
- **XSS 防护** - 输入数据经过适当的转义和验证
- **CORS 支持** - 合理配置跨域资源共享策略

## 📊 性能特性

- **边缘计算** - 基于 Cloudflare Workers 全球分布式部署
- **缓存优化** - 静态资源 CDN 加速
- **延迟加载** - 无限滚动和按需加载
- **轻量构建** - 使用 Vite 实现快速构建和 HMR
- **数据库性能** - D1 数据库提供低延迟访问

## 📄 许可证

[MIT License](LICENSE)

## 🤝 贡献

欢迎提交 Pull Request 或创建 Issue 来改进项目。

## 📞 支持

如果您在使用过程中遇到问题，请：

1. 查看 [Issues](https://github.com/Tokinx/Fig/issues)
2. 创建新的 Issue 描述问题
3. 联系项目维护者