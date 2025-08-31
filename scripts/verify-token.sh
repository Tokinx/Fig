#!/bin/bash

# Cloudflare API Token验证脚本
# 使用方法: ./verify-token.sh YOUR_API_TOKEN

set -e

if [ $# -eq 0 ]; then
    echo "❌ 错误: 请提供API Token"
    echo "使用方法: $0 YOUR_API_TOKEN"
    exit 1
fi

API_TOKEN="$1"

echo "🔍 验证Cloudflare API Token权限..."
echo ""

# 验证User权限
echo "📋 检查User权限..."
USER_RESPONSE=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
    "https://api.cloudflare.com/client/v4/user")

if echo "$USER_RESPONSE" | grep -q '"success":true'; then
    echo "✅ User权限正常 - 可以读取用户详情"
else
    echo "❌ User权限缺失 - 无法读取用户详情"
    echo "   需要添加: User:User Details:Read"
    exit 1
fi

# 验证Account权限
echo ""
echo "📋 检查Account权限..."
ACCOUNTS_RESPONSE=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
    "https://api.cloudflare.com/client/v4/accounts")

if echo "$ACCOUNTS_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Account权限正常 - 可以读取账户信息"
    
    # 提取第一个账户ID
    ACCOUNT_ID=$(echo "$ACCOUNTS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$ACCOUNT_ID" ]; then
        echo "   找到账户ID: $ACCOUNT_ID"
    fi
else
    echo "❌ Account权限缺失 - 无法读取账户信息"
    echo "   需要添加: Account:Read"
    exit 1
fi

# 验证Workers权限（如果有账户ID）
if [ -n "$ACCOUNT_ID" ]; then
    echo ""
    echo "📋 检查Workers权限..."
    WORKERS_RESPONSE=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
        "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/services")
    
    if echo "$WORKERS_RESPONSE" | grep -q '"success":true'; then
        echo "✅ Workers权限正常 - 可以管理Workers服务"
    else
        echo "❌ Workers权限缺失 - 无法管理Workers服务"
        echo "   需要添加: Cloudflare Workers:Edit"
        exit 1
    fi
fi

echo ""
echo "🎉 API Token验证通过！所有必需权限都已配置。"
echo ""
echo "📝 GitHub Secrets配置建议:"
echo "   CF_API_TOKEN = $API_TOKEN"
if [ -n "$ACCOUNT_ID" ]; then
    echo "   CF_ACCOUNT_ID = $ACCOUNT_ID"
fi
echo ""
echo "🚀 现在可以进行自动部署了！"