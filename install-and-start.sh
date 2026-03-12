#!/bin/bash

# 批发鱼账本系统 - 安装和启动脚本

echo ""
echo "========================================"
echo "  批发鱼账本系统 - 安装和启动"
echo "========================================"
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到Node.js，请先安装Node.js"
    echo "   访问: https://nodejs.org/"
    exit 1
fi

echo "✅ 检测到Node.js版本: $(node -v)"
echo ""

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 未检测到npm"
    exit 1
fi

echo "✅ 检测到npm版本: $(npm -v)"
echo ""

# 进入项目目录
cd "$(dirname "$0")"

# 安装依赖
echo "📦 正在安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo ""
echo "✅ 依赖安装成功"
echo ""

# 检查.env文件是否存在
if [ ! -f .env ]; then
    echo "ℹ️  未找到.env文件"
    echo "💡 提示: 如需使用云开发功能，请："
    echo "   1. 复制 .env.example 为 .env"
    echo "   2. 填入腾讯云API密钥"
    echo ""
    read -p "是否现在配置云开发? (y/n): " configure_cloud

    if [ "$configure_cloud" = "y" ] || [ "$configure_cloud" = "Y" ]; then
        cp .env.example .env
        echo ""
        echo "📝 请编辑 .env 文件，填入以下信息："
        echo "   - TCB_SECRET_ID: 腾讯云API密钥Secret ID"
        echo "   - TCB_SECRET_KEY: 腾讯云API密钥Secret Key"
        echo ""
        echo "🔑 获取密钥: https://console.cloud.tencent.com/cam/capi"
        echo ""
        read -p "配置完成后按回车继续..."
    fi
else
    echo "✅ 找到.env配置文件"
fi

echo ""
echo "========================================"
echo "  准备启动服务"
echo "========================================"
echo ""
echo "🚀 启动后端服务..."
echo ""

# 启动服务
npm start
