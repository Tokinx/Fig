# 前端自动构建流程

## 概述

本项目使用GitHub Actions自动化构建前端代码。当`web/`目录下的文件发生变更时，会自动触发构建流程。

## 工作流程

1. **触发条件**：
   - 向`main`分支推送代码且包含`web/`目录的变更
   - 向`main`分支提交Pull Request且包含`web/`目录的变更

2. **构建步骤**：
   - 检出代码
   - 设置Bun运行环境
   - 缓存依赖以提高构建速度
   - 安装项目依赖
   - 使用`ENV=production bun run build`构建前端
   - 将构建输出`web/dist`重命名为`pages`
   - 检查是否有变更需要提交
   - 自动提交并推送到当前仓库

3. **输出**：
   - 构建后的静态文件位于`pages/`目录
   - 自动提交包含构建时间和源代码哈希的详细信息

## 本地开发

### 开发模式
```bash
cd web
bun install
bun run dev
```

### 本地构建
```bash
cd web
bun run build
# 输出在 web/dist/ 目录
```

### 预览构建结果
```bash
cd web
bun run preview
```

## 文件结构

```
.
├── .github/
│   └── workflows/
│       └── build-frontend.yml    # GitHub Actions工作流
├── web/                          # 前端源代码
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── pages/                        # 自动生成的构建输出
│   ├── index.html
│   ├── assets/
│   └── ...
└── workers/                      # 后端代码
```

## 注意事项

- `pages/`目录由GitHub Actions自动管理，请勿手动修改
- 每次web目录的变更都会触发自动构建
- 构建失败时会在Actions页面显示详细错误信息
- 如果构建输出没有变更，不会创建新的提交

## 自定义配置

如需修改构建行为，请编辑：
- `.github/workflows/build-frontend.yml` - 修改GitHub Actions工作流
- `web/vite.config.js` - 修改Vite构建配置
- `web/package.json` - 修改构建脚本