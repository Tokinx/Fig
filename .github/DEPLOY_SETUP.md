# Cloudflare Workers 自动部署设置指南

## 🔐 GitHub Secrets 配置

为了安全地部署到Cloudflare Workers，您需要在GitHub仓库中设置以下Secrets和Variables。

### 🔑 必需的 GitHub Secrets

在您的GitHub仓库中，转到 `Settings` > `Secrets and variables` > `Actions`，添加以下Secrets：

#### Secrets（敏感信息）
```
CLOUDFLARE_API_TOKEN          # Cloudflare API Token（Global API Key或Custom Token）
WORKER_PASSWORD              # Workers应用的管理员密码
CF_ACCOUNT_ID                # 您的Cloudflare Account ID  
D1_DATABASE_ID               # D1数据库的ID
```

#### Variables（非敏感配置）
```
WORKER_NAME                  # Workers应用名称（默认：fig）
THEME_URL                    # 主题资源URL（默认：https://tokinx.github.io/Fig/pages）
SLUG_LENGTH                  # 短链接长度（默认：5）
D1_DATABASE_NAME             # D1数据库名称（默认：slug）
ANALYTICS_DATASET            # Analytics数据集名称（默认：fig_url_analytics）
```

## 📋 详细设置步骤

### 1. 获取Cloudflare API Token

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 转到 `My Profile` > `API Tokens`
3. 点击 `Create Token`
4. 选择 `Custom token` 或使用 `Global API Key`
5. 设置权限：
   - Zone: Zone:Read, Zone:Edit
   - Account: Cloudflare Workers:Edit
   - D1: D1:Edit (如果使用D1数据库)
   - Analytics: Analytics:Read (如果使用Analytics Engine)

### 2. 获取Account ID

1. 在Cloudflare Dashboard右侧边栏找到 `Account ID`
2. 复制这个ID

### 3. 获取D1数据库ID

1. 在Cloudflare Dashboard转到 `Workers & Pages` > `D1 SQL Database`
2. 找到您的数据库，点击进入详情页
3. 复制 `Database ID`

### 4. 在GitHub中设置Secrets

转到您的GitHub仓库：
1. 点击 `Settings` 标签
2. 在左侧菜单选择 `Secrets and variables` > `Actions`
3. 点击 `New repository secret`
4. 逐个添加上述Secrets

### 5. 在GitHub中设置Variables

在同一页面：
1. 点击 `Variables` 标签
2. 点击 `New repository variable`
3. 逐个添加上述Variables

## 🚀 部署触发条件

部署会在以下情况自动触发：
- 向 `main` 分支推送包含 `workers/` 目录变更的代码
- 向 `main` 分支提交包含 `workers/` 目录变更的Pull Request

## 📝 当前配置值

基于您现有的wrangler.toml，建议设置以下值：

### Secrets
```
CLOUDFLARE_API_TOKEN = "您的新API Token"
WORKER_PASSWORD = "Fig@1234"  # 或设置新密码
CF_ACCOUNT_ID = "bc920e7436485b250ead34a515fed181"
D1_DATABASE_ID = "27125d38-dcf0-429b-afb4-8aa3df4533af"
```

### Variables  
```
WORKER_NAME = "fig"
THEME_URL = "https://tokinx.github.io/Fig/pages"
SLUG_LENGTH = "5"
D1_DATABASE_NAME = "slug" 
ANALYTICS_DATASET = "fig_url_analytics"
```

## ⚠️ 安全注意事项

1. **删除wrangler.toml中的敏感信息**：部署脚本会动态生成安全的配置文件
2. **定期轮换API Token**：建议定期更新Cloudflare API Token
3. **最小权限原则**：确保API Token只有必需的权限
4. **监控部署日志**：检查GitHub Actions日志确保没有敏感信息泄露

## 🔧 故障排除

### 常见问题

1. **部署失败**：检查API Token权限和Account ID是否正确
2. **数据库连接失败**：确认D1 Database ID是否正确
3. **环境变量缺失**：确保所有必需的Secrets都已设置

### 调试步骤

1. 检查GitHub Actions日志
2. 验证Cloudflare Dashboard中的资源状态
3. 确认wrangler.toml生成是否正确（在部署日志中可见）

## 🎯 下一步

设置完成后，对 `workers/` 目录中的任何文件进行修改并推送，即可触发自动部署。部署完成后会进行健康检查，确保应用正常运行。