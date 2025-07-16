# Fig 短链接服务 - 前端

基于 Vue 3 构建的现代前端应用，提供链接管理、导航页等功能。

## 功能特性

- 🔐 用户认证系统
- 📝 链接创建和管理
- 📌 Pin 功能和导航页
- 🎨 响应式设计
- 📊 访问统计展示
- 🔄 拖拽排序功能

## 技术栈

- **Vue 3** - 响应式前端框架
- **Vite** - 快速构建工具
- **TailwindCSS** - 实用优先的 CSS 框架
- **Pinia** - 状态管理
- **Vue Router** - 路由管理
- **Radix Vue** - UI 组件库

## 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 项目结构

```
src/
├── components/          # 组件
│   ├── ui/             # UI组件
│   ├── link/           # 链接相关组件
│   └── navigation/     # 导航页组件
├── pages/              # 页面
├── stores/             # Pinia状态管理
├── services/           # API服务
├── utils/              # 工具函数
└── assets/             # 静态资源
```

## 环境变量

```env
VITE_API_URL=http://localhost:8787
```

## 部署

构建后将 `dist` 目录部署到静态托管服务。