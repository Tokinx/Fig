# Workers Backend

ShortUrl项目的后端部分，基于Cloudflare Workers构建。

## 技术栈

- Cloudflare Workers
- Hono框架
- D1数据库
- Analytics Engine（可选）

## 本地开发设置

1. **安装依赖**：
   ```bash
   cd workers
   bun install
   ```

2. **配置wrangler.toml**：
   ```bash
   # 复制示例配置文件
   cp wrangler.example.toml wrangler.toml
   
   # 编辑配置文件，填入您的实际配置
   # 注意：请不要提交包含真实API Token的配置文件
   ```

3. **本地开发**：
   ```bash
   bun run dev
   ```

## 部署

GitHub Actions将在workers目录有变更时自动部署到Cloudflare Workers。

请按照 [部署设置指南](../docs/DEPLOY_SETUP.md) 配置必要的环境变量。

## 配置文件说明

- `wrangler.example.toml` - 示例配置文件（已提交到仓库）
- `wrangler.toml` - 本地开发配置文件（包含真实配置，在.gitignore中）

## 安全注意事项

- 永远不要将包含真实API Token的配置文件提交到代码仓库
- 使用GitHub Secrets管理生产环境的敏感信息
- 本地开发建议使用独立的数据库和API Token