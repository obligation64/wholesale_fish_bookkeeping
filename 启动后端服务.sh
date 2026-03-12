#!/bin/bash

echo "========================================"
echo "  水产批发记账系统 - 后端服务启动脚本"
echo "========================================"
echo ""

# 进入项目目录
cd /home/zhoumeihua/wholesale_fish_bookkeeping

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js"
    echo ""
    echo "请先安装 Node.js："
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  CentOS/RHEL:   sudo yum install nodejs npm"
    echo "  或访问: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"
echo ""

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
    echo ""
else
    echo "✅ 依赖已安装，跳过安装步骤"
    echo ""
fi

# 检查数据库文件
if [ -f "fish_bookkeeping.db" ]; then
    echo "📊 数据库文件已存在"
else
    echo "📊 将创建新的数据库文件"
fi

echo "========================================"
echo "  正在启动后端服务..."
echo "========================================"
echo ""
echo "🌐 服务地址: http://localhost:3000"
echo "📋 API 地址: http://localhost:3000/api"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# 启动服务
npm start
