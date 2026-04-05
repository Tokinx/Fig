# Cloudflare Workers 部署设置

## GitHub Secrets

在仓库 `Settings > Secrets and variables > Actions` 中配置：

```text
WORKER_PASSWORD
CF_API_TOKEN
CF_ACCOUNT_ID
D1_DATABASE_ID
```

## GitHub Variables

```text
WORKER_NAME
SLUG_LENGTH
D1_DATABASE_NAME
ANALYTICS_DATASET
```

`THEME_URL` 已废弃。生产环境前端静态资源现在直接来自 Worker 绑定的 `dist/`，不再依赖 GitHub Pages。

## 一键部署

Cloudflare 官方 deploy button 支持直接从公开 GitHub 仓库完成构建和部署。

项目地址：

`https://github.com/Tokinx/Fig`

一键部署链接：

`https://deploy.workers.cloudflare.com/?url=https://github.com/Tokinx/Fig`

仓库里的 [wrangler.jsonc](/root/Workspace/Fig/wrangler.jsonc) 已声明：

- `ASSETS`
- `SQLITE`
- `ANALYTICS`
- `vars`

因此 Cloudflare 会按配置自动创建对应资源并写回新仓库副本。根据官方文档，Deploy to Cloudflare 会读取源仓库中的 Wrangler 配置，并自动 provision D1、Analytics 等资源。

## 触发条件

部署工作流 `.github/workflows/deploy-workers.yml` 仅在 `main` 分支推送以下变更时触发：

- `src/web/**`
- `src/workers/**`
- `public/**`
- `index.html`
- `package.json`
- `vite.config.ts`
- `wrangler.jsonc`

Pull Request 不再直接触发生产部署，只做构建校验。

## 部署流程

工作流会自动执行：

1. `bun install`
2. `bun run build`
3. 使用 `wrangler.jsonc`
4. 使用 `cloudflare/wrangler-action` 部署 Worker 与 `dist/`

## 推荐的生产配置

```text
WORKER_NAME = "fig"
SLUG_LENGTH = "5"
D1_DATABASE_NAME = "slug"
ANALYTICS_DATASET = "fig_url_analytics"
```

## 安全注意事项

- 不要把真实 Cloudflare Token、Account ID 或数据库 ID 写入仓库中的 `wrangler.jsonc`
- 如果使用一键部署，请先修改默认 `PASSWORD`
- 生产部署只应该由 `main` 分支触发

## 故障排查

如果部署失败，优先检查：

1. `CF_API_TOKEN` 是否具备 Workers/D1 所需权限
2. `D1_DATABASE_ID` 是否正确
3. `dist/index.html` 是否在构建阶段成功生成
