#!/bin/bash

# Multi-Site 部署腳本
# 用於在 WSL + Docker 環境中部署應用

set -e

echo "🚀 開始部署 Multi-Site 管理系統..."

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安裝，請先安裝 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安裝，請先安裝 Docker Compose"
    exit 1
fi

# 建立資料目錄
mkdir -p data

# 設定環境變數
if [ ! -f .env.production ]; then
    echo "📝 建立 .env.production 檔案..."
    cat > .env.production << EOF
DATABASE_URL="file:/app/data/prod.db"
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
NEXTAUTH_URL="http://192.168.6.6:3000"
EOF
fi

# 建置並啟動容器
echo "🔨 建置 Docker 映像..."
docker-compose build

echo "🚀 啟動容器..."
docker-compose up -d

# 等待應用啟動
echo "⏳ 等待應用啟動..."
sleep 10

# 執行資料庫遷移
echo "📦 執行資料庫遷移..."
docker-compose exec multi-site npx prisma migrate deploy

# 執行種子資料（僅首次）
if [ ! -f data/.seeded ]; then
    echo "🌱 執行種子資料..."
    docker-compose exec multi-site npx prisma db seed
    touch data/.seeded
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "🌐 應用網址: http://192.168.6.6:3000"
echo ""
echo "📋 測試帳號:"
echo "   管理員: admin@example.com / admin123"
echo "   編輯者: editor@example.com / editor123"
echo ""
echo "🔧 常用命令:"
echo "   查看日誌: docker-compose logs -f"
echo "   停止服務: docker-compose down"
echo "   重啟服務: docker-compose restart"
echo "   進入容器: docker-compose exec multi-site sh"
