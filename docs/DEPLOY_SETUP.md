# Cloudflare Workers 自动部署设置指南

## 🔐 GitHub Secrets 配置

为了安全地部署到Cloudflare Workers，您需要在GitHub仓库中设置以下Secrets和Variables。

### 🔑 必需的 GitHub Secrets

在您的GitHub仓库中，转到 `Settings` > `Secrets and variables` > `Actions`，添加以下Secrets：

#### Secrets（敏感信息）
```
WORKER_PASSWORD              # Workers应用的管理员密码
CF_API_TOKEN                 # Cloudflare API Token（Global API Key或Custom Token）
CF_ACCOUNT_ID                # 您的Cloudflare Account ID
D1_DATABASE_ID               # D1数据库的ID
```

#### Variables（非敏感配置）
```
WORKER_NAME                  # Workers应用名称（默认：fig）
THEME_URL                    # 主题资源URL（默认：https://{用户名}.github.io/{仓库名}/pages）
SLUG_LENGTH                  # 短链接长度（可选，不设置则使用后端默认值）
D1_DATABASE_NAME             # D1数据库名称（默认：slug）
ANALYTICS_DATASET            # Analytics数据集名称（默认：fig_url_analytics）
```

## 📋 详细设置步骤

### 1. 获取Cloudflare API Token

**⚠️ 重要提醒**：当前的API Token权限不足，需要重新创建！

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 转到 `My Profile` > `API Tokens`
3. 点击 `Create Token`
4. 选择 `Custom token`
5. **重要：按以下顺序设置权限**：
   
   **Account权限**：
   - ✅ `Account:Read`
   - ✅ `Cloudflare Workers:Edit`
   
   **User权限**（⚠️ 这是关键！）：
   - ✅ `User:User Details:Read`
   
   **Zone权限**（如果需要域名功能）：
   - ✅ `Zone:Zone:Read`
   - ✅ `Zone:Zone Settings:Read`
   
   **其他权限**：
   - ✅ `D1:Edit` (必需，用于数据库操作)
   - ✅ `Zone Analytics:Read` (可选，用于Analytics Engine)

6. **资源范围**：
   - Account resources: `Include - All accounts` 或选择您的特定账户
   - Zone resources: `Include - All zones` 或选择特定域名

7. **TTL**: 设置合适的过期时间
8. 点击 `Continue to summary` 然后 `Create Token`
9. **立即复制Token值**（只显示一次）

**❌ 常见错误**：
- 忘记添加 `User:User Details:Read` 权限
- 只设置了 Account 权限而忘记 User 权限
- 资源范围设置错误

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
4. **重要：更新现有的CF_API_TOKEN**：
   - 如果 `CF_API_TOKEN` 已存在，点击它进行编辑
   - 将新创建的API Token值粘贴进去
   - 点击 `Update secret`
5. 确保以下Secrets都已正确设置：
   - `CF_API_TOKEN`: 新创建的包含所有必需权限的API Token
   - `CF_ACCOUNT_ID`: 您的Cloudflare Account ID
   - `WORKER_PASSWORD`: Workers应用的管理员密码
   - `D1_DATABASE_ID`: D1数据库的ID

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
CF_API_TOKEN = "您的新API Token"
WORKER_PASSWORD = "设置密码"
CF_ACCOUNT_ID = ""
D1_DATABASE_ID = ""
```

### Variables  
```
WORKER_NAME = "fig"
THEME_URL = "可选，不设置将自动使用当前仓库的pages地址"
SLUG_LENGTH = "可选，不设置则使用后端默认值"
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

1. **Authentication error [code: 10000] - 仍然出现**：
   - **解决方案**：您的API Token仍然缺少权限，请按以下步骤操作：
     ```bash
     # 1. 删除现有的API Token
     # 2. 按照上面的步骤重新创建API Token，确保包含所有权限
     # 3. 在GitHub Secrets中更新 CF_API_TOKEN
     # 4. 重新触发部署
     ```
   - **验证Token权限**：使用以下命令测试（将YOUR_TOKEN替换为实际Token）：
     ```bash
     curl -H "Authorization: Bearer YOUR_TOKEN" \
          "https://api.cloudflare.com/client/v4/user"
     ```
     如果返回用户信息，说明Token有效且包含User权限。

2. **"Unable to retrieve email for this user"**：
   - 这是正常的，Custom Token无法显示邮箱
   - 只要没有其他错误，部署应该能正常进行

3. **部署失败**：检查API Token权限和Account ID是否正确
4. **数据库连接失败**：确认D1 Database ID是否正确
5. **环境变量缺失**：确保所有必需的Secrets都已设置

### 调试步骤

1. 检查GitHub Actions日志
2. 验证Cloudflare Dashboard中的资源状态
3. 确认wrangler.toml生成是否正确（在部署日志中可见）

## 🎯 下一步

设置完成后，对 `workers/` 目录中的任何文件进行修改并推送，即可触发自动部署。部署完成后会进行健康检查，确保应用正常运行。