# 前端构建与静态资源发布

## 当前模型

前端已经不再单独发布到 `pages/`，而是作为 Cloudflare Workers 的静态资源一起部署。

构建链路如下：

1. Vite 从根目录读取 `index.html`
2. 前端源码位于 `src/web/`
3. `bun run build` 输出到根目录 `dist/`
4. `wrangler deploy` 将 `dist/` 作为 `[assets]` 一并发布

## 本地开发

```bash
bun install
bun run dev:web
```

如果同时需要联调 Worker：

```bash
bun run dev:worker
```

Worker 在本地会根据 `FRONTEND_DEV_SERVER_URL` 回退代理到 Vite dev server，因此仍然保留热更新体验。

## CI 行为

`.github/workflows/build-frontend.yml` 现在只负责：

- 安装根目录依赖
- 执行 `bun run build`
- 校验 `dist/` 是否生成

它不再：

- 重命名 `web/dist`
- 生成 `pages/`
- 自动提交构建产物回仓库

## 目录

```text
.
├── public/
├── src/
│   └── web/
├── dist/
├── index.html
├── package.json
└── vite.config.ts
```

## 注意事项

- `dist/` 是构建产物，不应手工编辑
- 生产静态资源由 Worker 的 `ASSETS` 绑定提供
- 若新增根级公共资源，例如 `robots.txt` 或 `manifest.webmanifest`，请放入 `public/`
