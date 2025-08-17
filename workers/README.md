# Workers Backend

ShortUrl项目的后端部分，基于Cloudflare Workers构建。

## 技术栈

- Cloudflare Workers
- Hono框架
- D1数据库
- Analytics Engine（可选）

## 本地开发

```bash
cd workers
bun install
bun run dev
```

## 部署

GitHub Actions将在workers目录有变更时自动部署到Cloudflare Workers。

请按照 [部署设置指南](../.github/DEPLOY_SETUP.md) 配置必要的环境变量。