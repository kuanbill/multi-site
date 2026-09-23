<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 遠端 Docker 與部署作業

- 正式服務主機：`192.168.6.6`；專案目錄：`C:\Users\markkuan\multi-site`；Git 部署分支為 `main`。
- 正式容器由 Windows Docker Desktop 管理。Ubuntu WSL 內的 Docker Engine/CLI 已移除；不要在 WSL 安裝、啟動或使用獨立 Docker daemon。Docker Desktop 管理的 `docker-desktop` WSL 發行版屬 Windows Docker Desktop，不要手動移除。
- 遠端部署請透過 SSH 登入 Windows 主機，使用 Windows Docker Desktop 的 `docker compose` 與遠端 `.env.production`。不要在本機或 Ubuntu WSL 對正式 Docker engine 執行部署。
- 部署前先確認工作目錄為乾淨的 `main` 且已更新 `origin/main`；不要覆蓋遠端未追蹤的 `data/`、資料庫、上傳檔或其他使用者檔案。
- 執行正式 migration 前，先以 SQLite 線上備份方式備份 `data/prod.db`，並確認備份 `quick_check` 為 `ok`。Migration 使用 `npx prisma migrate deploy`。
- 正式環境不可設定 `SEED_DATABASE=true` 或執行 `prisma db seed`；只使用不破壞既有內容的 migration 或專用冪等資料初始化。
- Compose 命令須明確指定環境檔與專案檔，例如：

  ```powershell
  docker compose --env-file C:\Users\markkuan\multi-site\.env.production -f C:\Users\markkuan\multi-site\docker-compose.yml config --quiet
  docker compose --env-file C:\Users\markkuan\multi-site\.env.production -f C:\Users\markkuan\multi-site\docker-compose.yml build
  docker compose --env-file C:\Users\markkuan\multi-site\.env.production -f C:\Users\markkuan\multi-site\docker-compose.yml up -d
  docker compose --env-file C:\Users\markkuan\multi-site\.env.production -f C:\Users\markkuan\multi-site\docker-compose.yml exec -T multi-site npx prisma migrate deploy
  ```

- 部署後確認 `multi-site-app` 為 `running` 且健康狀態為 `healthy`、Prisma migrations 為最新，並以正式 HTTPS 網址檢查首頁回應。
- 不得將密碼、SSH 金鑰、`.env.production` 內容或任何部署秘密寫入 `AGENTS.md`、程式碼或 Git。
