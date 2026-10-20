# Google Drive 文件連結 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在五個指定站點功能中管理多筆 Google Drive PDF 連結，並在前台已發布且可見的資料上提供檢視／下載連結。

**Architecture:** 新增獨立的 `ContentExternalLink` 多型資料表，以 `siteId`、`ownerType`、`ownerId` 關聯五種既有內容，不改造既有本站媒體庫附件。共用 Google Drive URL 驗證、transaction 同步與 client URL 欄位元件；各功能 API 與前台頁面只負責提供 owner type 與資料呈現。

**Tech Stack:** Next.js 16 App Router、React 19、Prisma 7、SQLite、TypeScript、Vitest、Tailwind CSS。

**Spec:** `docs/superpowers/specs/2026-10-20-google-drive-document-links-design.md`

## Global Constraints

- 只接受 `https:` 且 hostname 為 `drive.google.com` 或 `www.drive.google.com` 的 URL。
- 非空但無效的 URL 必須回傳 `Google Drive 連結格式無效`，空白 URL 不儲存。
- Google Drive 連結的權限由「取得連結者可檢視」控制，本站不代理檔案。
- 既有 `ContentAttachment`／本站媒體庫附件行為必須保留。
- 前台只呈現已發布內容，並沿用 `requirePublicFeature` 的公開／會員限定檢查。
- 正式 migration 前依 `AGENTS.md` 先做 SQLite 線上備份並確認 `quick_check=ok`；不可執行 seed。

## Review Focus

- `drive.google.com.evil.example`、`javascript:`、`http:` 與非 URL 字串不可儲存：由 Task 1 驗證器測試固定。
- URL 陣列含空白列、重複列時應 trim、去重、保留順序：由 Task 1 驗證器測試固定。
- 更新送空陣列必須清除舊連結，未提供欄位則保留舊連結：由各 API task 測試固定。
- 草稿／封存資料與未啟用或會員限定功能不可在公開頁洩漏連結：由各前台 task 的查詢與 markup 測試固定。
- 刪除父資料時不能留下外部連結孤兒資料：由 API delete transaction 測試固定。

---

### Task 1: Google Drive URL 驗證與外部連結資料模型

**Files:**
- Create: `src/lib/contentExternalLinks.ts`
- Create: `src/lib/contentExternalLinks.test.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_content_external_links/migration.sql`
- Test: `src/lib/contentExternalLinks.test.ts`

**Interfaces:**
- Produces `parseGoogleDriveUrls(value: unknown): string[]`：接受 URL 陣列，trim、忽略空白、去重並保留順序；非法非空值拋出 `Google Drive 連結格式無效`。
- Produces `syncContentExternalLinks(tx, input)`：以 `{ siteId: number; ownerType: string; ownerId: number; urls: string[] }` transaction 內刪除舊資料並依序建立新資料。
- Produces `readContentExternalLinks(prisma, input)`：回傳依 `sortOrder asc, id asc` 排序的 `{ id, url, sortOrder }[]`。

- [ ] **Step 1: Write the failing tests**
  - 驗證 `https://drive.google.com/file/d/abc/view?usp=sharing` 通過並保留 query。
  - 驗證 `www.drive.google.com` 通過。
  - 驗證 `http://drive.google.com/...`、`https://drive.google.com.evil.example/...`、`javascript:...` 與非字串拋出指定錯誤。
  - 驗證 `['  URL  ', '', 'URL', 'URL2']` 回傳 `[URL, URL2]`。
  - 驗證同步資料按輸入順序產生，空陣列清除舊連結。
- [ ] **Step 2: Run tests to verify they fail**
  - Run: `npx vitest run src/lib/contentExternalLinks.test.ts`
  - Expected: FAIL because the parser／model helper does not exist yet。
- [ ] **Step 3: Add the Prisma model and minimal helpers**
  - 建立 `ContentExternalLink` 欄位與索引；`Site` 增加 `externalLinks` relation。
  - 實作 exact-host validation、同步與排序讀取，不下載或探測遠端檔案。
- [ ] **Step 4: Generate the migration and run tests**
  - Run: `npx prisma migrate dev --name add_content_external_links`（只在開發資料庫產生 migration，執行者確認 migration SQL 未修改既有資料）。
  - Run: `npx vitest run src/lib/contentExternalLinks.test.ts`
  - Expected: PASS。
- [ ] **Step 5: Commit**
  - `git add src/lib/contentExternalLinks.ts src/lib/contentExternalLinks.test.ts prisma/schema.prisma prisma/migrations`
  - `git commit -m "feat: add Google Drive content links"`

### Task 2: 共用後台多筆 URL 欄位元件

**Files:**
- Create: `src/components/admin/GoogleDriveLinksField.tsx`
- Create: `src/components/admin/GoogleDriveLinksField.test.tsx`
- Modify: `src/components/admin/index.ts`

**Interfaces:**
- `GoogleDriveLinksField({ value, onChange, disabled? }: { value: string[]; onChange: (value: string[]) => void; disabled?: boolean })`。
- 初始 `value=[]` 時仍渲染一個空 URL input；新增按鈕追加空字串；移除按鈕保留至少一個欄位。

- [ ] **Step 1: Write the failing test**
  - 靜態 markup 測試確認空值有一個 `Google Drive URL` input、`新增檔案連結` 按鈕與「取得連結者可檢視」提示；有兩筆值時各自渲染且有移除控制。
- [ ] **Step 2: Run the test to verify it fails**
  - Run: `npx vitest run src/components/admin/GoogleDriveLinksField.test.tsx`
  - Expected: FAIL because the component does not exist。
- [ ] **Step 3: Implement the component**
  - 使用現有 admin 表單樣式與 `min-h-11` hit area；每列提供 URL input、移除按鈕，新增按鈕追加一列；不在 client 端複製 server validation。
- [ ] **Step 4: Run the test to verify it passes**
  - Run: `npx vitest run src/components/admin/GoogleDriveLinksField.test.tsx`
  - Expected: PASS。
- [ ] **Step 5: Commit**
  - `git add src/components/admin/GoogleDriveLinksField.tsx src/components/admin/GoogleDriveLinksField.test.tsx src/components/admin/index.ts`
  - `git commit -m "feat: add repeatable Google Drive link field"`

### Task 3: 公告欄 Google Drive 連結

**Files:**
- Modify: `src/app/api/[siteSlug]/admin/announcement/route.ts`
- Modify: `src/app/api/[siteSlug]/admin/announcement/[id]/route.ts`
- Modify: `src/app/api/[siteSlug]/admin/announcement/route.test.ts`
- Modify: `src/app/api/[siteSlug]/admin/announcement/[id]/route.test.ts`
- Modify: `src/app/admin/sites/[siteSlug]/announcement/AnnouncementForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/announcement/[id]/edit/page.tsx`
- Modify: `src/app/(public)/[siteSlug]/announcement/[slug]/page.tsx`
- Create or modify: public announcement page test

**Interfaces:**
- POST/PATCH 接受 `driveUrls: unknown`，使用 Task 1 parser；GET detail與編輯初始資料回傳 `driveUrls: string[]`。
- owner type 固定為 `announcement`。

- [ ] **Step 1: Write failing API and public tests**
  - 建立一筆含兩個 valid URLs 的公告並確認 `ContentExternalLink.createMany` 收到正確順序。
  - PATCH `driveUrls: []` 確認 deleteMany 清除舊連結；非法 host 回 400 且公告不更新。
  - 已發布公告詳細頁 markup 包含兩個 `target="_blank"` Google Drive link；草稿查詢不回傳公開頁。
- [ ] **Step 2: Run focused tests to verify failure**
  - Run: `npx vitest run src/app/api/[siteSlug]/admin/announcement/route.test.ts src/app/api/[siteSlug]/admin/announcement/[id]/route.test.ts`
  - Expected: FAIL because routes/forms/pages do not handle `driveUrls`。
- [ ] **Step 3: Implement API, form, edit loading, and public rendering**
  - transaction 內使用共用 sync helper；delete route 清理 `ownerType=announcement`；表單使用共用元件，建立後重置為一個空欄位。
  - 公告詳細頁只查已發布資料的 external links，顯示「相關 PDF」與序號連結。
- [ ] **Step 4: Run focused tests**
  - Run the focused command from Step 2; Expected: PASS。
- [ ] **Step 5: Commit**
  - `git add` the listed announcement files; `git commit -m "feat: add Google Drive links to announcements"`

### Task 4: 公開展覽 Google Drive 連結

**Files:**
- Modify: `src/app/api/[siteSlug]/admin/exhibition/route.ts`
- Modify: `src/app/api/[siteSlug]/admin/exhibition/[id]/route.ts`
- Modify: existing or create exhibition route tests
- Modify: `src/app/admin/sites/[siteSlug]/exhibition/ExhibitionForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/exhibition/page.tsx`
- Modify: `src/app/(public)/[siteSlug]/exhibition/[slug]/page.tsx`

**Interfaces:**
- owner type `exhibition`; preserve legacy `attachmentIds` media behavior while adding `driveUrls`.

- [ ] **Step 1: Add failing create/update/delete and public tests**
  - Test multiple links are persisted in order, invalid link rejects, empty update clears, delete removes links, and published detail displays links alongside existing media attachments.
- [ ] **Step 2: Run focused tests and verify failure**
  - Run: `npx vitest run src/app/api/[siteSlug]/admin/exhibition src/app/(public)/[siteSlug]/exhibition`
  - Expected: FAIL on missing external-link calls/markup。
- [ ] **Step 3: Implement API, server initial props, form, and public detail rendering**
  - Load all links by exhibition IDs on the admin list page and pass each form its `driveUrls`; preserve existing media ID field.
- [ ] **Step 4: Run focused tests and commit**
  - Run the focused command; Expected: PASS。
  - Commit: `feat: add Google Drive links to exhibitions`。

### Task 5: 會議記錄 Google Drive 連結

**Files:**
- Modify: `src/app/api/[siteSlug]/admin/meeting/route.ts`
- Modify: `src/app/api/[siteSlug]/admin/meeting/[id]/route.ts`
- Modify: `src/app/api/[siteSlug]/admin/meeting/route.test.ts` and detail tests if present
- Modify: `src/app/admin/sites/[siteSlug]/meeting/MeetingForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/meeting/page.tsx`
- Modify: `src/app/(public)/[siteSlug]/meeting/page.tsx`
- Modify: `src/app/(public)/[siteSlug]/meeting/page.test.tsx`

**Interfaces:**
- owner type `meeting`; `driveUrls` is independent from legacy PDF/image media ID arrays.

- [ ] **Step 1: Add failing tests**
  - Verify multiple Drive links persist and render under the correct meeting; invalid URL returns 400; public page only lists links for published meetings.
- [ ] **Step 2: Run focused tests and verify failure**
  - Run: `npx vitest run src/app/api/[siteSlug]/admin/meeting src/app/(public)/[siteSlug]/meeting/page.test.tsx`
- [ ] **Step 3: Implement persistence, form initialization, and public list rendering**
  - Keep existing PDF/image media attachment labels; append a separate「相關 PDF」section for Drive links.
- [ ] **Step 4: Run focused tests and commit**
  - Expected: PASS。
  - Commit: `feat: add Google Drive links to meeting records`。

### Task 6: 協力廠商 Google Drive 連結

**Files:**
- Modify: `src/app/api/[siteSlug]/admin/vendors/route.ts`
- Modify: `src/app/api/[siteSlug]/admin/vendors/[id]/route.ts`
- Modify: vendor route tests (create if missing)
- Modify: `src/app/admin/sites/[siteSlug]/vendors/VendorForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/vendors/page.tsx`
- Modify: `src/app/(public)/[siteSlug]/vendors/[id]/page.tsx`

**Interfaces:**
- owner type `vendor`; preserve logo and legacy media attachment IDs.

- [ ] **Step 1: Add failing tests**
  - Verify create/update validation, clearing, owner scoping, deletion cleanup, and published vendor detail links.
- [ ] **Step 2: Run focused tests and verify failure**
  - Run: `npx vitest run src/app/api/[siteSlug]/admin/vendors src/app/(public)/[siteSlug]/vendors`
- [ ] **Step 3: Implement API, form, admin initial values, and public links**
  - Use the shared field with a default empty row and show links under existing contract documents.
- [ ] **Step 4: Run focused tests and commit**
  - Expected: PASS。
  - Commit: `feat: add Google Drive links to vendors`。

### Task 7: 選配作業 Google Drive 連結

**Files:**
- Modify: `src/app/api/[siteSlug]/admin/selection/route.ts`
- Modify: `src/app/api/[siteSlug]/admin/selection/[id]/route.ts`
- Modify: `src/app/api/[siteSlug]/admin/selection/route.test.ts`
- Modify: `src/app/api/[siteSlug]/admin/selection/[id]/route.test.ts`
- Modify: `src/app/admin/sites/[siteSlug]/selection/SelectionForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/selection/[id]/edit/page.tsx`
- Modify: `src/app/(public)/[siteSlug]/selection/page.tsx`
- Modify: `src/app/(public)/[siteSlug]/selection/page.test.tsx`

**Interfaces:**
- owner type `selection`; preserve existing uploaded Media attachment editor and add `driveUrls` as a separate list.

- [ ] **Step 1: Add failing tests**
  - Verify Drive URLs persist with existing media attachments, invalid URLs reject, empty array clears, and public published selection items display links.
- [ ] **Step 2: Run focused tests and verify failure**
  - Run: `npx vitest run src/app/api/[siteSlug]/admin/selection src/app/(public)/[siteSlug]/selection`
- [ ] **Step 3: Implement API, edit initialization, form section, and public rendering**
  - Display a「相關 PDF」list before or after the existing media section without changing image/PDF upload behavior.
- [ ] **Step 4: Run focused tests and commit**
  - Expected: PASS。
  - Commit: `feat: add Google Drive links to selections`。

### Task 8: Full verification and migration readiness

**Files:**
- Modify only if verification exposes a regression.

- [ ] **Step 1: Run all tests**
  - `npm test`
  - Expected: all test files and tests pass。
- [ ] **Step 2: Run lint and production build**
  - `npm run lint` (0 errors; pre-existing warnings may remain)
  - `npm run build` (exit 0; existing Turbopack filesystem warnings may remain)
- [ ] **Step 3: Inspect migration and Git diff**
  - `npx prisma migrate status`
  - `git diff --check`
  - Confirm no `.env.production`, password, SSH credential, or generated production data is tracked。
- [ ] **Step 4: Commit final integration if needed**
  - `git status --short` must list only intentional source, test, schema, migration, and plan/spec files。
