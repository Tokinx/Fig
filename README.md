# Fig 短链接服务系统

> 一个功能丰富的短链接服务系统，支持 Pin 功能、导航页、拖拽排序等高级功能

## 功能特性

### 🚀 核心功能
- **智能短链接**: 支持自定义和随机生成短链接
- **多种访问模式**: redirect、remind、cloaking、proxy 四种访问模式
- **访问控制**: 密码保护、访问次数限制、过期时间设置

### 📌 Pin 功能
- **链接固定**: 将重要链接固定到导航页
- **个性化展示**: 自定义图标、颜色和描述
- **拖拽排序**: 支持导航页卡片拖拽排序

### 🎯 导航页
- **个人主页**: 展示固定链接的美观卡片界面
- **响应式设计**: 完美适配桌面端和移动端
- **编辑模式**: 支持实时编辑和管理

### 🛡️ 安全与统计
- **访问统计**: 详细的访问分析和数据报告
- **自定义提醒**: 支持自定义提醒页面文本
- **安全防护**: 完善的错误处理和安全机制

## 技术架构

### 前端技术栈
- **Vue 3**: 现代响应式前端框架
- **Vite**: 快速构建工具
- **TailwindCSS**: 实用优先的 CSS 框架
- **Radix Vue**: 高质量的 UI 组件库
- **Pinia**: 现代状态管理
- **VueUse**: 实用工具集合
- **Sortable.js**: 拖拽排序功能

### 后端技术栈
- **Cloudflare Workers**: 边缘计算平台
- **D1 Database**: 无服务器 SQLite 数据库
- **RESTful API**: 标准化 API 设计
- **中间件系统**: 模块化请求处理

## 项目结构

```
fig/
├── web/                    # 前端项目
│   ├── src/
│   │   ├── components/     # 组件
│   │   │   ├── ui/         # UI组件库
│   │   │   ├── common/     # 通用组件
│   │   │   ├── navigation/ # 导航相关
│   │   │   └── link/       # 链接相关
│   │   ├── pages/          # 页面组件
│   │   ├── stores/         # Pinia状态管理
│   │   ├── services/       # API服务
│   │   └── utils/          # 工具函数
│   └── ...
├── workers/                # 后端项目
│   ├── src/
│   │   ├── handlers/       # 请求处理器
│   │   ├── middleware/     # 中间件
│   │   ├── services/       # 业务服务
│   │   └── utils/          # 工具函数
│   └── ...
├── todo.md                 # 任务管理
├── CHANGELOG.md            # 变更日志
└── README.md              # 项目说明
```

## 快速开始

### 1. 开发环境

```bash
# 安装依赖
cd web && npm install
cd workers && npm install

# 启动开发服务器
cd web && npm run dev      # 前端：http://localhost:3000
cd workers && npm run dev  # 后端：http://localhost:8787
```

### 2. 部署到生产环境

详细部署步骤请参考 [DEPLOYMENT.md](DEPLOYMENT.md)

```bash
# 部署后端
cd workers && wrangler deploy

# 部署前端
cd web && npm run build
# 将 dist 目录部署到静态托管服务
```

## 使用指南

### 管理员登录
1. 访问前端应用
2. 使用管理员密码登录
3. 进入管理面板

### 创建短链接
1. 在管理面板中填写目标URL
2. 可选择自定义短链接或自动生成
3. 设置访问模式和安全选项
4. 点击"创建链接"

### Pin 功能使用
1. 在链接列表中点击"固定"按钮
2. 固定的链接会出现在导航页
3. 支持拖拽排序和自定义样式

### 访问短链接
- 直接访问：`https://your-domain.com/short-key`
- 导航页：`https://your-domain.com/navigation`

## 功能特性详解

### 🔗 智能短链接生成
- 支持自定义短链接
- 自动生成随机短链接
- URL 格式验证和预览

### 📌 Pin 功能
- 一键固定重要链接
- 拖拽排序支持
- 自定义图标和颜色
- 响应式卡片展示

### 🎯 多种访问模式
- **直接跳转**: 302 重定向到目标URL
- **提醒页面**: 显示自定义提醒信息
- **隐藏模式**: 使用 iframe 隐藏真实地址
- **代理模式**: 服务器端代理访问

### 🛡️ 安全控制
- 密码保护访问
- 访问次数限制
- 过期时间设置
- JWT 认证系统

### 📊 访问统计
- 实时访问计数
- 详细访问分析
- 地理位置统计
- 设备类型统计

## API 文档

### 认证接口
```bash
# 登录
POST /api/auth/login
{
  "password": "admin-password"
}

# 获取用户信息
GET /api/auth/me
Authorization: Bearer <token>
```

### 链接管理
```bash
# 创建链接
POST /api/links
{
  "url": "https://example.com",
  "key": "custom-key",
  "title": "链接标题",
  "mode": "redirect"
}

# 获取链接列表
GET /api/links?page=1&limit=20

# 更新链接
PUT /api/links/:key
{
  "title": "新标题"
}

# 删除链接
DELETE /api/links/:key
```

### Pin 功能
```bash
# 固定链接
POST /api/links/:key/pin

# 取消固定
DELETE /api/links/:key/pin

# 更新排序
PUT /api/navigation/order
{
  "order": [
    {"key": "link1", "order": 0},
    {"key": "link2", "order": 1}
  ]
}
```

## 文档

- [部署指南](DEPLOYMENT.md) - 详细的部署步骤
- [开发指南](DEVELOPMENT.md) - 开发者指南
- [任务管理](todo.md) - 项目任务进度
- [变更日志](CHANGELOG.md) - 版本更新记录

## 贡献指南

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 发起 Pull Request

## 许可证

MIT License

Copyright (c) 2025 Fig 短链接服务系统

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 致谢

感谢所有为此项目做出贡献的开发者和用户！

- Vue.js 团队提供的优秀前端框架
- Cloudflare 提供的强大边缘计算平台
- Radix UI 团队提供的无障碍组件库
- TailwindCSS 团队提供的实用 CSS 框架

## 支持

如果您发现任何问题或有改进建议，请：

1. 查看 [常见问题](DEVELOPMENT.md#常见问题)
2. 搜索现有的 [Issues](https://github.com/your-repo/issues)
3. 创建新的 Issue 或 Pull Request

---

*项目创建时间：2025-01-15*  
*预计完成时间：已完成基础功能开发*

**✨ 感谢使用 Fig 短链接服务系统！**