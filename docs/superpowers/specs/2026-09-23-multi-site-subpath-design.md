# 多子站子路徑架構設計 (2026-09-23)

**Goal:** 為每個都更專案提供獨立子路徑 `ur.landagent.com.tw/{siteSlug}/`，含站點獨立使用者、共用功能的可插拔開關、以及公開前台，全部在現有 Next.js 16 + Prisma SQLite 單實例上實現。

**Architecture:** 子路徑多租戶 (Path-Prefix Multi-Tenant) — `proxy.ts` 解析第一段路徑為 `siteSlug` 並注入 `x-site-slug`，前台 `(public)/[siteSlug]` 匿名可見，後台 `(dashboard)/[siteSlug]/admin` 需 `SiteUser` 授權；功能透過 `FeatureDefinition` 全域目錄 + `SiteFeature` 站點啟用表動態驅動 Sidebar/前台導覽；全域 `admin` 跨站，站用戶嚴格 1:1。

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Prisma 7 + better-sqlite3, NextAuth 4, Tailwind 4, Docker Compose + Nginx

**Status:** 已通過 5 段設計審核 (2026-09-23)

---

## 1. 整體架構與路由

### URL 契約
- 前台: `/{siteSlug}/`, `/{siteSlug}/pages/{pageSlug}`, `/{siteSlug}/posts/{postSlug}`
- 後台: `/{siteSlug}/admin`, `/{siteSlug}/admin/pages|posts|users|settings/features`, `/{siteSlug}/login`
- 全域: `/sites` (admin 站清單), `/login` (admin 登入), `/admin/features` (功能目錄 CRUD)

### App Router 結構
```
src/app/
  (public)/[siteSlug]/page.tsx, pages/[pageSlug]/page.tsx, posts/[postSlug]/page.tsx
  (auth)/login/page.tsx, [siteSlug]/login/page.tsx
  (dashboard)/[siteSlug]/admin/layout.tsx, page.tsx, pages/, posts/, users/, settings/features/
  (dashboard)/sites/page.tsx (全域, 301 導向)
  (dashboard)/admin/features/page.tsx
  api/[siteSlug]/admin/pages|posts|users/route.ts, api/admin/features/route.ts
```

### Proxy 設計 (`src/proxy.ts`)
- 解析 `pathname.split('/')[1]` 為 candidateSlug，跳過 `RESERVED = ['login','register','api','sites','admin','_next','favicon']`
- 驗證存在性 (快取 Map, revalidate 60s) -> 不存在則 rewrite 404
- 注入 `x-site-slug` header
- matcher: `'/((?!api/auth|_next|.*\\..*).*)'`，`authorized` 判斷：public 匿名放行，admin 需 session + SiteUser

### 相容
- 舊 `/sites/[id]/pages|posts|edit` 保留並 301 至 `/{slug}/admin/*`
- 舊 `api/sites/[id]/*` 保留 deprecation

---

## 2. 資料模型

```prisma
model Site { slug @unique, status String @default("active"), features SiteFeature[] }
model FeatureDefinition { key @unique, label, icon, path, description, isSystem Boolean, siteFeatures SiteFeature[] }
model SiteFeature { siteId, featureId, enabled, sortOrder, @@unique([siteId, featureId]) }
model User { email @unique, role, sites SiteUser[] }
model SiteUser { userId, siteId, role, @@unique([userId, siteId]) }
```

- FeatureDefinition 種子: pages/posts/media (isSystem=true) + faq/timeline/contact (isSystem=false)
- 站建立時自動為 defaultEnabled 功能建立 SiteFeature(enabled:true)
- SiteFeature.sortOrder 決定導覽排序

---

## 3. 認證與授權

### Session 擴充 (`src/lib/auth.ts`)
- callbacks.jwt 載入 `siteRoles: {siteId, slug, role}[]` 來自 `prisma.siteUser.findMany`
- authorize 支援可選 `siteSlug` 參數，若提供則校驗 `SiteUser` 存在，否則全域 admin 跳過

### 雙登入
- `/login` 全域表單 (無 siteSlug) 僅 admin 可進，非 admin 提示至專案網址
- `/{siteSlug}/login` 帶隱藏 siteSlug，校驗歸屬，成功 redirect `/{siteSlug}/admin`

### 守衛 (`src/lib/siteAuth.ts`)
- `requireSiteAccess(siteSlug)` : getServerSession -> admin 放行 -> 檢查 siteRoles -> 否則 redirect 403/404
- `requireFeature(siteId, featureKey)` : 查 SiteFeature.enabled
- 後台 layout 與 api handler 首行呼叫

### 使用者管理 (邀請制)
- 移除自助 register 為主流程，改 `POST /api/[siteSlug]/admin/users/invite` {email,name,role}
- 若 User 不存在則 create + random password (MVP 顯示一次性密碼), 然後 SiteUser.create
- 一般用戶 SiteUser.count>1 拒絕 (admin 例外)
- DELETE 僅刪 SiteUser 不刪 User

---

## 4. 功能開關 (可增訂選單)

- 全域 `/admin/features` CRUD FeatureDefinition (isSystem 不可刪)
- 站點 `/{siteSlug}/admin/settings/features` 勾選啟用 + 拖曳排序 -> upsert SiteFeature
- Sidebar 與 SiteHeader 動態查詢 `findMany({where:{siteId, enabled:true}, include:{feature}, orderBy:{sortOrder}})`
- API/頁面守衛: 未啟用回 403/404

---

## 5. 公開前台

- `(public)/[siteSlug]/page.tsx` 站首頁: site.description + 最新 published posts + 頁面連結
- `pages/[pageSlug]` 查 Page, `posts/[postSlug]` 僅 published:true
- `export const revalidate = 60` 或 `force-dynamic`
- `SiteHeader` 按 features 渲染導覽, `generateMetadata` 依 site.name
- 預覽: `?preview=1` 需 requireSiteAccess 才可見草稿

---

## 6. 部署與測試

- Nginx 單 server_name, 單 location 直通, 無泛域名
- Docker 單容器單 DB, NEXTAUTH_URL 保持 https://ur.landagent.com.tw
- 遷移: 單次 migrate add_feature_definitions, Seed 自動補
- 驗證: npx tsc --noEmit, npm run lint, npm run build, docker compose config --quiet, 手動清單 (前台匿名/草稿/未啟用/跨站/切站/新增功能即時生效)

---

## 7. 風險
- proxy 每請求查 Site -> Map 快取緩解
- 一人一站約束為應用層, 需在 invite API 嚴格檢查
