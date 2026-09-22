#!/bin/bash

# Multi-Site 部署腳本
# 用於在 WSL + Docker 環境中部署應用

set -e

DOCKER_BIN="${DOCKER_BIN:-docker}"
WINDOWS_DOCKER_BIN="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
if [ "$DOCKER_BIN" = "docker" ] && [ -f "$WINDOWS_DOCKER_BIN" ]; then
    DOCKER_BIN="$WINDOWS_DOCKER_BIN"
fi

echo "🚀 開始部署 Multi-Site 管理系統..."

# 檢查 Docker 是否安裝
if ! "$DOCKER_BIN" version &> /dev/null; then
    echo "❌ Docker 未安裝，請先安裝 Docker"
    exit 1
fi

if ! "$DOCKER_BIN" compose version &> /dev/null; then
    echo "❌ Docker Compose plugin 未安裝，請先安裝 Docker Compose"
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
NEXTAUTH_URL="https://ur.landagent.com.tw"
EOF
fi

# 建置並啟動容器
echo "🔨 建置 Docker 映像..."
"$DOCKER_BIN" compose --env-file .env.production build

echo "🚀 啟動容器..."
"$DOCKER_BIN" compose --env-file .env.production up -d

# 等待應用啟動
echo "⏳ 等待應用啟動..."
sleep 10

# 執行資料庫遷移
echo "📦 執行資料庫遷移..."
"$DOCKER_BIN" compose --env-file .env.production exec multi-site npx prisma migrate deploy

# 執行種子資料（僅明確 opt-in 且僅首次）
if [ "${SEED_DATABASE:-}" = "true" ] && [ ! -f data/.seeded ]; then
    echo "🌱 執行種子資料..."
    "$DOCKER_BIN" compose --env-file .env.production exec multi-site npx prisma db seed > /dev/null
    touch data/.seeded
fi

NEXTAUTH_URL="$(awk '/^NEXTAUTH_URL=/ { sub(/^[^=]*=/, ""); sub(/^"/, ""); sub(/"$/, ""); print; exit }' .env.production)"

echo ""
echo "✅ 部署完成！"
echo ""
echo "🌐 應用網址: ${NEXTAUTH_URL}"
echo ""
echo "🔧 常用命令:"
echo "   查看日誌: $DOCKER_BIN compose --env-file .env.production logs -f"
echo "   停止服務: $DOCKER_BIN compose --env-file .env.production down"
echo "   重啟服務: $DOCKER_BIN compose --env-file .env.production restart"
echo "   進入容器: $DOCKER_BIN compose --env-file .env.production exec multi-site sh"
