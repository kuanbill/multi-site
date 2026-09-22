# multi-site

多子站後台管理系統 MVP，提供以 Next.js、NextAuth、Prisma 與 SQLite 建置的登入及內容管理基礎。

## 目前功能

- 使用電子郵件與密碼註冊、登入，並保護後台頁面。
- 儀表板顯示子網站、使用者及文章數量。
- 子網站管理：建立、編輯、刪除子網站，並管理名稱、網址代稱與描述。
- 使用者管理：查看使用者及切換 `admin` / `editor` 角色。
- 已建立頁面、文章與媒體的資料模型，以及頁面與文章的列表/API 基礎。
- 頁面與文章的編輯路由、媒體上傳目前尚未完成，請勿視為已交付功能。

## 環境需求

- Node.js 22
- npm
- 部署時需要 Docker 與 Docker Compose

## 本機開發

在專案根目錄執行：

```bash
npm ci
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

`.env` 至少需要以下設定。請使用僅供本機開發的值，正式環境不要沿用：

```dotenv
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="請替換成本機開發用的隨機字串"
NEXTAUTH_URL="http://localhost:3000"
```

啟動後可在 <http://localhost:3000> 開啟系統。

### 開發種子帳號

執行 `npx prisma db seed` 會建立以下開發帳號與範例資料：

| 角色 | 帳號 | 密碼 |
| --- | --- | --- |
| 管理員 | `admin@example.com` | `admin123` |
| 編輯者 | `editor@example.com` | `editor123` |

上述帳號與密碼只供本機開發及測試，**絕對不要在正式環境使用**。正式環境應建立新的帳號並使用安全、唯一的密碼與秘密金鑰。

## 驗證

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Docker 部署

`deploy.sh` 預期在 WSL 或可執行 Bash 的 Docker 環境中使用；在 Windows + WSL 環境會優先使用 Docker Desktop 的 Windows engine，避免將服務部署到只存在於 WSL 的另一個 Docker engine。執行：

```bash
./deploy.sh
```

正式部署前請確認 production 環境變數：

```dotenv
DATABASE_URL="file:/app/data/prod.db"
NEXTAUTH_SECRET="請使用安全且唯一的正式環境秘密"
NEXTAUTH_URL="https://你的正式網域"
```

不要把真實秘密提交到版本庫。`deploy.sh` 在 `.env.production` 不存在時會建立部署用設定，包含隨機產生的 `NEXTAUTH_SECRET`、正式 SQLite 路徑與 `https://ur.landagent.com.tw` 部署網址；Compose 會要求 `DATABASE_URL`、`NEXTAUTH_SECRET` 與 `NEXTAUTH_URL` 必須由環境檔提供，不再提供預設秘密。正式環境請確認 `.env.production` 的設定與實際網域一致。

一般部署流程會建置映像、啟動 `multi-site` 容器，並在每次部署執行資料庫遷移：

```bash
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
docker compose --env-file .env.production exec multi-site npx prisma migrate deploy
```

若要在開發環境或已人工確認的初始化環境建立種子資料，必須明確 opt-in：

```bash
SEED_DATABASE=true ./deploy.sh
```

一般執行 `./deploy.sh` 不會執行 seed；上述指令只會在 `data/.seeded` 不存在時執行，建立固定測試帳號（`admin@example.com` / `admin123`、`editor@example.com` / `editor123`），並重建及破壞範例關聯、頁面與文章資料。種子資料僅限開發或人工確認的初始化，請勿在正式資料庫執行，也不要任意刪除 `data/.seeded`。

資料庫位於容器的 `/app/data/prod.db`，並透過 `./data:/app/data` 掛載到主機；請保留 `data` 目錄以維持資料。Docker 將主機的 80 port 映射到容器的 3000 port，Cloudflare Flexible SSL 負責使用者端 HTTPS，Cloudflare 到主機端則使用 HTTP。容器健康檢查使用映像內建的 BusyBox `wget` 發送 HTTP 探測。

常用容器命令：

```bash
docker compose --env-file .env.production logs -f
docker compose --env-file .env.production down
docker compose --env-file .env.production restart
docker compose --env-file .env.production exec multi-site sh
```

## Nginx 與 HTTPS

`nginx.conf` 的設定會將 HTTP 導向 HTTPS，並把 HTTPS 請求反向代理到 `127.0.0.1:3000`。正式環境請：

- 將 `server_name` 改成實際網域。
- 使用受信任憑證，並更新 `ssl_certificate` 與 `ssl_certificate_key`。
- 確認 `NEXTAUTH_URL` 使用實際的 HTTPS 網址。

`create-cert.ps1` 使用 `New-SelfSignedCertificate` 建立開發用自簽憑證，不能取代正式 CA 憑證。現有腳本與 Nginx 設定中的路徑包含 `C:/Users/markkuan/nginx/ssl/` 及 `C:\Users\markkuan\temp\`，都是特定機器的路徑，部署到其他主機前必須修改；自簽憑證也會造成瀏覽器不信任警告。
