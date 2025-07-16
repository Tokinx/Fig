# Fig 短链接服务系统 - 开发指南

这是一个完整的开发指南，帮助开发者快速上手 Fig 短链接服务系统的开发。

## 项目结构

```
fig/
├── web/                    # 前端项目
│   ├── src/
│   │   ├── components/     # 组件
│   │   │   ├── ui/         # UI组件库
│   │   │   ├── common/     # 通用组件
│   │   │   ├── navigation/ # 导航页组件
│   │   │   └── link/       # 链接管理组件
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
├── DEPLOYMENT.md           # 部署指南
└── README.md              # 项目说明
```

## 开发环境搭建

### 1. 前提条件

- Node.js 18+
- npm 或 yarn
- Cloudflare 账户
- Wrangler CLI

### 2. 安装依赖

```bash
# 前端项目
cd web
npm install

# 后端项目
cd workers
npm install
```

### 3. 本地开发

#### 启动前端开发服务器

```bash
cd web
npm run dev
```

访问 `http://localhost:3000`

#### 启动后端开发服务器

```bash
cd workers
npm run dev
```

后端服务运行在 `http://localhost:8787`

## 技术栈详解

### 前端技术栈

#### Vue 3 + Composition API
- 使用 `<script setup>` 语法
- 响应式数据管理
- 组合式 API

#### Vite
- 快速热更新
- 模块化构建
- 开发服务器

#### TailwindCSS
- 实用优先的 CSS 框架
- 响应式设计
- 自定义设计系统

#### Radix Vue
- 无样式组件库
- 可访问性支持
- 完整的 UI 组件

#### Pinia
- 现代状态管理
- 类型安全
- 开发工具支持

### 后端技术栈

#### Cloudflare Workers
- 边缘计算
- 无服务器架构
- 全球分布式

#### D1 Database
- 无服务器 SQLite
- 自动扩展
- 低延迟

#### RESTful API
- 标准 HTTP 方法
- JSON 数据格式
- 统一响应结构

## 开发规范

### 1. 代码规范

#### 前端代码规范

```javascript
// 组件命名：PascalCase
// 文件命名：kebab-case
// 变量命名：camelCase

// 示例组件
<template>
  <div class="component-wrapper">
    <h1>{{ title }}</h1>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props 定义
const props = defineProps({
  title: {
    type: String,
    required: true
  }
})

// 响应式数据
const isVisible = ref(false)

// 计算属性
const displayTitle = computed(() => props.title.toUpperCase())

// 方法
const handleClick = () => {
  isVisible.value = !isVisible.value
}
</script>
```

#### 后端代码规范

```javascript
// 处理器函数
export const handler = {
  async create(request, env, ctx) {
    try {
      const data = await parseJsonBody(request)
      
      // 验证数据
      if (!data.url) {
        return errorResponse({ message: 'URL不能为空' }, 400)
      }
      
      // 业务逻辑
      const result = await service.create(data)
      
      return successResponse(result, '创建成功')
    } catch (error) {
      return errorResponse({ message: error.message }, 500)
    }
  }
}
```

### 2. 数据结构规范

#### API 响应格式

```javascript
// 成功响应
{
  "success": true,
  "data": { /* 响应数据 */ },
  "message": "操作成功",
  "timestamp": 1642147200
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": { /* 错误详情 */ }
  },
  "timestamp": 1642147200
}
```

### 3. 数据库设计规范

#### 表结构设计

```sql
-- 表名：小写+下划线
-- 字段名：小写+下划线
-- 主键：统一命名或使用 id
-- 时间戳：使用 INTEGER 类型存储 Unix 时间戳
-- 布尔值：使用 BOOLEAN 类型

CREATE TABLE shorten (
    key TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

## 功能模块开发

### 1. 添加新页面

#### 1.1 创建页面组件

```javascript
// src/pages/NewPage.vue
<template>
  <div class="new-page">
    <h1>新页面</h1>
  </div>
</template>

<script setup>
// 页面逻辑
</script>
```

#### 1.2 添加路由

```javascript
// src/main.js
const routes = [
  // ... 其他路由
  {
    path: '/new-page',
    name: 'NewPage',
    component: () => import('./pages/NewPage.vue')
  }
]
```

### 2. 添加新的 API 端点

#### 2.1 创建处理器

```javascript
// src/handlers/newHandler.js
import { successResponse, errorResponse } from '../utils/index'

export const newHandler = {
  async list(request, env, ctx) {
    // 处理逻辑
    return successResponse(data)
  },

  async create(request, env, ctx) {
    // 处理逻辑
    return successResponse(result, '创建成功')
  }
}
```

#### 2.2 添加路由

```javascript
// src/router.js
import { newHandler } from './handlers/newHandler'

// 添加路由
router.get('/api/new', newHandler.list)
router.post('/api/new', newHandler.create)
```

### 3. 状态管理

#### 3.1 创建 Store

```javascript
// src/stores/newStore.js
import { defineStore } from 'pinia'

export const useNewStore = defineStore('new', {
  state: () => ({
    items: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchItems() {
      this.loading = true
      try {
        const response = await api.get('/api/new')
        this.items = response.data
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    }
  }
})
```

#### 3.2 使用 Store

```javascript
// 在组件中使用
import { useNewStore } from '@/stores/newStore'

const newStore = useNewStore()

onMounted(() => {
  newStore.fetchItems()
})
```

## 测试

### 1. 前端测试

```bash
# 运行测试
npm run test

# 生成覆盖率报告
npm run test:coverage
```

### 2. 后端测试

```bash
# 本地测试
npm run dev

# 使用 curl 测试 API
curl -X POST http://localhost:8787/api/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## 调试技巧

### 1. 前端调试

```javascript
// 在组件中使用 console.log
console.log('Debug data:', data)

// 使用 Vue DevTools
// 在浏览器中安装 Vue DevTools 扩展
```

### 2. 后端调试

```javascript
// 在 Workers 中使用 console.log
console.log('Debug info:', info)

// 查看实时日志
wrangler tail
```

## 性能优化

### 1. 前端优化

```javascript
// 懒加载组件
const LazyComponent = defineAsyncComponent(() => import('./LazyComponent.vue'))

// 使用 computed 缓存计算结果
const expensiveValue = computed(() => {
  return heavyCalculation(props.data)
})
```

### 2. 后端优化

```javascript
// 使用 KV 缓存
const cached = await env.CACHE.get(key)
if (cached) {
  return JSON.parse(cached)
}

// 数据库查询优化
const stmt = db.prepare('SELECT * FROM table WHERE indexed_field = ?')
```

## 部署流程

### 1. 开发环境

```bash
# 启动开发服务器
npm run dev
```

### 2. 测试环境

```bash
# 构建测试版本
npm run build

# 部署到测试环境
wrangler deploy --env=staging
```

### 3. 生产环境

```bash
# 构建生产版本
npm run build

# 部署到生产环境
wrangler deploy
```

## 常见问题

### Q: 如何添加新的 UI 组件？
A: 在 `src/components/ui/` 目录下创建新组件，遵循现有组件的结构。

### Q: 如何修改数据库结构？
A: 修改 `schema.sql` 文件，然后重新运行数据库初始化。

### Q: 如何配置环境变量？
A: 在 `wrangler.toml` 文件中添加环境变量。

### Q: 如何处理 CORS 问题？
A: 修改 `src/middleware/cors.js` 文件中的允许源设置。

## 贡献指南

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m 'Add new feature'`
4. 推送到分支：`git push origin feature/new-feature`
5. 创建 Pull Request

## 获取帮助

- 查看项目文档
- 提交 Issue
- 参与讨论

---

感谢您对 Fig 短链接服务系统的贡献！