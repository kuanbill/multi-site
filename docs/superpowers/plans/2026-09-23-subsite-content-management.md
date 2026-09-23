# 子網站專案後台內容管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將每個子網站擴充為可管理首頁、公告欄、都更進度、公開展覽、會議記錄、協力廠商、正式選配與相關圖資的專案後台，並依站點設定控制前台公開或成員限定。

**Architecture:** 以專用 Prisma content models 取代通用 Page/Post 作為新功能的資料來源，保留既有模型供相容與搬遷。沿用 `siteSlug` 路徑多租戶、`FeatureDefinition`/`SiteFeature`、NextAuth session 與站點角色；新增共用內容授權、發布狀態、媒體附件與 visibility helper，讓所有 API 和前台頁面使用相同規則。

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Prisma 7, SQLite, NextAuth 4, React 19, Tailwind 4, better-sqlite3。

**Spec:** `docs/superpowers/specs/2026-09-23-subsite-content-management-design.md`

## Global Constraints

- Node.js >= 22，npm >= 9，Windows workspace `C:\multi-site`。
- 單 SQLite；本機使用 `file:./dev.db`，Docker 使用 `file:/app/data/prod.db`。
- 所有資料查詢必須以 URL 的 `siteSlug` 解析出的 `siteId` 為範圍。
- 介面與錯誤訊息使用繁體中文。
- `enabled=false` 只隱藏/封鎖前台；有內容管理權限者仍可維護後台草稿。
- `visibility=public` 允許訪客查看已發布內容；`visibility=members` 僅允許該站成員。
- 第一階段的「正式選配」只管理說明、規則、文件與外部連結，不保存住戶選配結果。
- 不刪除既有 `Page`、`Post`、舊 API 或未相關的使用者/站點流程。
- 不把真實秘密寫入程式碼、測試或文件。

---

## File Map

### Schema and shared server logic

- Modify: `prisma/schema.prisma` - 新增 `SiteFeature.visibility`、首頁與七項內容模型、附件 metadata。
- Modify: `prisma/seed.ts` - 將預設功能替換為新八項功能，補預設 visibility 與範例資料。
- Create: `src/lib/contentTypes.ts` - 狀態、功能 key、meeting type、visibility 的共用型別與常數。
- Create: `src/lib/contentAccess.ts` - 站點、角色、功能啟用與前台 visibility 檢查。
- Create: `src/lib/contentValidation.ts` - 各內容 API 共用欄位、slug、日期與附件驗證。
- Create: `src/lib/contentValidation.test.ts` - 驗證 slug、狀態、日期與外部連結規則。
- Modify: `src/lib/site.ts` - 讀取啟用功能時納入 visibility，提供站點功能設定查詢。
- Create: `src/lib/media.ts` - 媒體 metadata、檔案類型、持久化路徑與附件關聯 helper。

### Site admin

- Create: `src/app/[siteSlug]/admin/home/page.tsx` - 首頁設定。
- Create: `src/app/[siteSlug]/admin/home/HomeForm.tsx` - 首頁 client form。
- Create: `src/app/[siteSlug]/admin/announcement/page.tsx` - 公告列表。
- Create: `src/app/[siteSlug]/admin/announcement/AnnouncementForm.tsx` - 公告新增/編輯表單。
- Create: `src/app/[siteSlug]/admin/announcement/new/page.tsx` - 新增公告頁。
- Create: `src/app/[siteSlug]/admin/announcement/[id]/edit/page.tsx` - 編輯公告頁。
- Create: `src/app/[siteSlug]/admin/progress/page.tsx` - 都更進度列表。
- Create: `src/app/[siteSlug]/admin/progress/ProgressForm.tsx` - 進度表單。
- Create: `src/app/[siteSlug]/admin/exhibition/page.tsx` - 展覽列表與表單入口。
- Create: `src/app/[siteSlug]/admin/exhibition/ExhibitionForm.tsx` - 展覽表單與圖庫附件。
- Create: `src/app/[siteSlug]/admin/meeting/page.tsx` - 會議記錄列表與表單入口。
- Create: `src/app/[siteSlug]/admin/meeting/MeetingForm.tsx` - 會議記錄表單與 PDF 附件。
- Create: `src/app/[siteSlug]/admin/vendors/page.tsx` - 協力廠商列表與表單入口。
- Create: `src/app/[siteSlug]/admin/vendors/VendorForm.tsx` - 廠商表單。
- Create: `src/app/[siteSlug]/admin/selection/page.tsx` - 正式選配單頁表單。
- Create: `src/app/[siteSlug]/admin/selection/SelectionForm.tsx` - 選配說明表單。
- Create: `src/app/[siteSlug]/admin/maps/page.tsx` - 相關圖資列表與表單入口。
- Create: `src/app/[siteSlug]/admin/maps/MapForm.tsx` - 圖資表單。
- Modify: `src/app/[siteSlug]/admin/settings/features/page.tsx` - 顯示與儲存 visibility。
- Modify: `src/app/[siteSlug]/admin/settings/features/SiteFeatureClient.tsx` - visibility select 與說明。
- Modify: `src/components/Sidebar.tsx` - 使用新 feature path，保留設定/成員入口。

### APIs

- Create: `src/app/api/[siteSlug]/admin/home/route.ts` - 首頁 GET/PATCH。
- Create: `src/app/api/[siteSlug]/admin/announcement/route.ts` - 公告 GET/POST。
- Create: `src/app/api/[siteSlug]/admin/announcement/[id]/route.ts` - 公告 GET/PATCH/DELETE。
- Create: `src/app/api/[siteSlug]/admin/progress/route.ts` - 進度 GET/POST。
- Create: `src/app/api/[siteSlug]/admin/progress/[id]/route.ts` - 進度 GET/PATCH/DELETE。
- Create: `src/app/api/[siteSlug]/admin/exhibition/route.ts` - 展覽 GET/POST。
- Create: `src/app/api/[siteSlug]/admin/exhibition/[id]/route.ts` - 展覽 GET/PATCH/DELETE。
- Create: `src/app/api/[siteSlug]/admin/meeting/route.ts` - 會議 GET/POST。
- Create: `src/app/api/[siteSlug]/admin/meeting/[id]/route.ts` - 會議 GET/PATCH/DELETE。
- Create: `src/app/api/[siteSlug]/admin/vendors/route.ts` - 廠商 GET/POST。
- Create: `src/app/api/[siteSlug]/admin/vendors/[id]/route.ts` - 廠商 GET/PATCH/DELETE。
- Create: `src/app/api/[siteSlug]/admin/selection/route.ts` - 選配 GET/PATCH。
- Create: `src/app/api/[siteSlug]/admin/maps/route.ts` - 圖資 GET/POST。
- Create: `src/app/api/[siteSlug]/admin/maps/[id]/route.ts` - 圖資 GET/PATCH/DELETE。
- Create: `src/app/api/[siteSlug]/admin/assets/route.ts` - 圖片/PDF 上傳。
- Create: `src/app/api/[siteSlug]/admin/assets/[id]/route.ts` - 媒體刪除。
- Modify: `src/app/api/[siteSlug]/admin/features/route.ts` - 接受與回傳 visibility。

### Public site

- Modify: `src/app/(public)/[siteSlug]/page.tsx` - 使用 `SiteHome`，顯示最新公告與目前進度。
- Modify: `src/components/public/SiteHeader.tsx` - 新功能名稱與排序。
- Create: `src/app/(public)/[siteSlug]/announcement/page.tsx` - 公告列表。
- Create: `src/app/(public)/[siteSlug]/announcement/[slug]/page.tsx` - 公告詳細頁。
- Create: `src/app/(public)/[siteSlug]/progress/page.tsx` - 進度時間軸。
- Create: `src/app/(public)/[siteSlug]/exhibition/page.tsx` - 展覽列表/詳細內容。
- Create: `src/app/(public)/[siteSlug]/meeting/page.tsx` - 會議記錄分組列表。
- Create: `src/app/(public)/[siteSlug]/vendors/page.tsx` - 廠商卡片與詳細資料。
- Create: `src/app/(public)/[siteSlug]/selection/page.tsx` - 選配說明與文件。
- Create: `src/app/(public)/[siteSlug]/maps/page.tsx` - 圖資圖庫。
- Create: `src/app/[siteSlug]/_components/MemberFeatureGate.tsx` - 成員限定頁的伺服器端 gate（若路由群組不適合共用則由 `contentAccess` 直接使用）。

### Verification and documentation

- Modify: `README.md` - 更新八項功能、visibility、附件儲存與資料驗證說明。
- Modify: `package.json` - 加入 Vitest test script 與開發依賴。
- Create: `docs/superpowers/plans/2026-09-23-subsite-content-management.md` - 本實作計畫。

---

### Task 1: Schema, Feature Registry, and Seed

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Create: `src/lib/contentTypes.ts`
- Modify: `src/lib/features.ts`
- Modify: `src/lib/site.ts`
- Create: Prisma migration generated by `npx prisma migrate dev --name add_subsite_content_management`。

**Interfaces:**
- Produces `CONTENT_FEATURES`, `ContentStatus`, `FeatureVisibility`, `MeetingType`。
- Produces Prisma models `SiteHome`, `Announcement`, `ProgressItem`, `Exhibition`, `MeetingRecord`, `Vendor`, `SelectionInfo`, `MapAsset`, `ContentAttachment`。
- Extends `SiteFeature` with `visibility String @default("public")`。

- [ ] **Step 1: Add the test runner and schema verification command**

Install the test runner and add the script before writing tests:

```powershell
npm install -D vitest
```

Add this package script:

```json
"test": "vitest run"
```

Also run the schema verification command:

```powershell
npx prisma validate
```

The command is the first executable schema guard; do not invent a second ORM test harness.

- [ ] **Step 2: Extend the Prisma schema**

Add the following fields/models while preserving existing `Page`, `Post`, and `Media`:

```prisma
model SiteFeature {
  id         Int      @id @default(autoincrement())
  siteId     Int
  featureId  Int
  enabled    Boolean  @default(true)
  sortOrder  Int      @default(0)
  displayMode String  @default("list")
  visibility String   @default("public")
  site       Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  feature    FeatureDefinition @relation(fields: [featureId], references: [id], onDelete: Cascade)
  @@unique([siteId, featureId])
}
```

Add the content models from the design spec. Use `siteId` relations with `onDelete: Cascade`, `status` string defaults to `draft`, and compound uniqueness for site-scoped slugs. Use nullable `DateTime` for optional publication/deadline dates.

- [ ] **Step 3: Define the feature registry**

Replace the old pages/posts/media default registry with:

```ts
export const CONTENT_FEATURES = [
  { key: 'announcements', label: '公告欄', icon: '📢', path: 'announcement', isSystem: true, defaultVisibility: 'public' },
  { key: 'progress', label: '都更進度', icon: '📈', path: 'progress', isSystem: true, defaultVisibility: 'public' },
  { key: 'exhibitions', label: '公開展覽', icon: '🖼️', path: 'exhibition', isSystem: true, defaultVisibility: 'public' },
  { key: 'meetings', label: '會議記錄', icon: '📝', path: 'meeting', isSystem: true, defaultVisibility: 'members' },
  { key: 'vendors', label: '協力廠商', icon: '🏢', path: 'vendors', isSystem: true, defaultVisibility: 'members' },
  { key: 'selection', label: '正式選配', icon: '🏠', path: 'selection', isSystem: true, defaultVisibility: 'members' },
  { key: 'maps', label: '相關圖資', icon: '🗺️', path: 'maps', isSystem: true, defaultVisibility: 'members' },
] as const;
```

Keep `home` as a fixed route rather than a Sidebar item. Remove old registry entries from seed creation but do not delete existing database definitions in a destructive migration.

- [ ] **Step 4: Update seed behavior**

Upsert each `CONTENT_FEATURES` definition and initialize every known site with `enabled: true`, its `defaultVisibility`, and deterministic `sortOrder`. Use `upsert` for `SiteHome` so rerunning seed does not erase operator data. Add only minimal sample records when the table is empty.

- [ ] **Step 5: Create and apply the migration**

Run:

```powershell
npx prisma migrate dev --name add_subsite_content_management
npx prisma generate
npx prisma validate
```

Expected: migration adds the new columns/tables without dropping existing Page/Post/Media rows.

- [ ] **Step 6: Verify seed and generated types**

Run:

```powershell
npx prisma db seed
npx tsc --noEmit
```

Expected: seed succeeds and the generated Prisma client exposes every model used by later tasks.

- [ ] **Step 7: Commit the schema slice**

```powershell
git add prisma src/lib/contentTypes.ts src/lib/features.ts src/lib/site.ts
git commit -m "feat: add subsite content models and default features"
```

---

### Task 2: Shared Authorization, Validation, and Media

**Files:**
- Create: `src/lib/contentAccess.ts`
- Create: `src/lib/contentValidation.ts`
- Create: `src/lib/media.ts`
- Modify: `src/lib/siteAuth.ts`
- Modify: `src/lib/site.ts`

**Interfaces:**

```ts
export type SiteContext = { site: Site; session: Session; siteRole: 'admin' | 'editor' | 'viewer' | 'global-admin' };
export async function requireSiteContext(siteSlug: string): Promise<SiteContext>;
export async function requireContentPermission(siteSlug: string, action: 'read' | 'write' | 'publish' | 'delete'): Promise<SiteContext>;
export async function requirePublicFeature(siteSlug: string, featureKey: string): Promise<{ site: Site; feature: SiteFeature & { feature: FeatureDefinition } }>;
export function parseContentStatus(value: unknown): ContentStatus;
export function validateSlug(value: unknown): string;
export function validateExternalUrl(value: unknown): string | null;
export function validateAsset(file: File): { extension: string; mimeType: string };
```

- [ ] **Step 1: Write failing validation tests first**

Create `src/lib/contentValidation.test.ts` with pure validation tests:

```ts
import { describe, expect, it } from 'vitest';
import { validateExternalUrl, validateSlug } from './contentValidation';

describe('content validation', () => {
  it('accepts a site-scoped slug', () => {
    expect(validateSlug('public-meeting-2026')).toBe('public-meeting-2026');
  });

  it('rejects unsafe slugs', () => {
    expect(() => validateSlug('../private')).toThrow('slug');
  });

  it('accepts only http and https external URLs', () => {
    expect(validateExternalUrl('https://example.com')).toBe('https://example.com');
    expect(() => validateExternalUrl('javascript:alert(1)')).toThrow('網址');
  });
});
```

Run `npm test -- src/lib/contentValidation.test.ts` and verify it fails because the helper is not implemented. Keep authorization logic in pure functions where possible and add a `npm run lint`/`npx tsc --noEmit` gate. Manually exercise these exact cases against the dev database before implementation is marked complete:

```text
global admin -> every site: read/write/publish/delete
site admin   -> own site: every site content action
editor       -> own site: read/write/publish, no feature/member settings
viewer       -> own site: read only
editor       -> other site: 403
anonymous    -> public feature: read published only
anonymous    -> members feature: redirect to /{siteSlug}/login
```

- [ ] **Step 2: Implement one site context helper**

Resolve the site once with `getSiteBySlug`, get the server session with `authOptions`, recognize global `admin`, and otherwise find the matching `session.user.siteRoles` entry. Return 404 for an unknown/archived site and 401/redirect for no session according to caller context.

- [ ] **Step 3: Implement action authorization**

Allow `read` to all site members, `write`/`publish` to site admin/editor, and `delete` to site admin/global admin. Do not use `SiteFeature.enabled` to block backend content maintenance; only public route visibility uses it.

- [ ] **Step 4: Implement content validation**

Reject blank titles/names, invalid slug characters outside `[a-z0-9-]+`, invalid status values, invalid meeting types, invalid progress statuses, end dates before start dates, and external URLs that are not `http` or `https`. Return field-level Traditional Chinese errors.

- [ ] **Step 5: Implement media storage helpers**

Use `process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads')`, create the directory recursively, generate a random stored filename, allow only image and PDF MIME types, and persist `filename`, `url`, `type`, `mimeType`, `sizeBytes`, and `altText`. Never use the client-provided filename as a storage path.

- [ ] **Step 6: Verify shared helpers**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

- [ ] **Step 7: Commit shared server logic**

```powershell
git add src/lib
git commit -m "feat: add subsite content authorization and media helpers"
```

---

### Task 3: Home and Feature Settings

**Files:**
- Create: `src/app/api/[siteSlug]/admin/home/route.ts`
- Create: `src/app/[siteSlug]/admin/home/page.tsx`
- Create: `src/app/[siteSlug]/admin/home/HomeForm.tsx`
- Modify: `src/app/[siteSlug]/admin/settings/features/page.tsx`
- Modify: `src/app/[siteSlug]/admin/settings/features/SiteFeatureClient.tsx`
- Modify: `src/app/api/[siteSlug]/admin/features/route.ts`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- `GET /api/{siteSlug}/admin/home` returns `SiteHome` plus site name/description.
- `PATCH /api/{siteSlug}/admin/home` accepts only the editable homepage fields and returns the saved row.
- Feature settings payload adds `visibility: 'public' | 'members'`.

- [ ] **Step 1: Add failing API cases**

Verify the endpoint contract with requests that must return 401/403/400:

```json
{ "tagline": "", "contactEmail": "not-an-email" }
```

Then implement the route using `requireContentPermission(siteSlug, 'write')`; only site admin/global admin may update feature visibility.

- [ ] **Step 2: Implement home API and form**

Use `prisma.siteHome.upsert({ where: { siteId }, create: ..., update: ... })`. The form edits tagline, intro, currentStage, contact fields, and hero media URL/ID. Do not accept `siteId` from the request body.

- [ ] **Step 3: Implement feature visibility control**

Extend existing GET/POST handling to return and persist `visibility`, validate it against `public|members`, and preserve `enabled`, `sortOrder`, and `displayMode`.

- [ ] **Step 4: Update Sidebar**

Render the new feature paths in database order. Do not render old `pages`, `posts`, or `media` entries as default items; keep the global admin feature catalog separate.

- [ ] **Step 5: Verify home/settings**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

Manually verify an editor can edit homepage content but cannot change visibility, while a site admin can change a feature from public to members.

- [ ] **Step 6: Commit home/settings**

```powershell
git add src/app/[siteSlug]/admin src/app/api/[siteSlug]/admin/home src/app/api/[siteSlug]/admin/features src/components/Sidebar.tsx
git commit -m "feat: add site home settings and feature visibility"
```

---

### Task 4: Announcement and Progress Content

**Files:**
- Create: `src/app/api/[siteSlug]/admin/announcement/route.ts`
- Create: `src/app/api/[siteSlug]/admin/announcement/[id]/route.ts`
- Create: `src/app/api/[siteSlug]/admin/progress/route.ts`
- Create: `src/app/api/[siteSlug]/admin/progress/[id]/route.ts`
- Create: `src/app/[siteSlug]/admin/announcement/page.tsx`
- Create: `src/app/[siteSlug]/admin/announcement/new/page.tsx`
- Create: `src/app/[siteSlug]/admin/announcement/[id]/edit/page.tsx`
- Create: `src/app/[siteSlug]/admin/announcement/AnnouncementForm.tsx`
- Create: `src/app/[siteSlug]/admin/progress/page.tsx`
- Create: `src/app/[siteSlug]/admin/progress/ProgressForm.tsx`
- Create: `src/app/(public)/[siteSlug]/announcement/page.tsx`
- Create: `src/app/(public)/[siteSlug]/announcement/[slug]/page.tsx`
- Create: `src/app/(public)/[siteSlug]/progress/page.tsx`
- Modify: `src/app/(public)/[siteSlug]/page.tsx`

**Interfaces:**
- Announcement CRUD uses `Announcement` and compound site/slug uniqueness.
- Progress CRUD uses `ProgressItem`; setting a published item to `current` demotes the old current item in a transaction.

- [ ] **Step 1: Implement announcement list/create API**

Require site context and `write` for POST. Normalize title/slug, set `status` to `draft` unless explicitly publishing, and query only the current `siteId`. Return 409 for duplicate slug.

- [ ] **Step 2: Implement announcement detail API**

For GET/PATCH/DELETE, parse `params.id` as a positive integer and include the site condition in every `where` clause. Delete attachment links before deleting the content row. Only site admin/global admin may delete.

- [ ] **Step 3: Implement progress API**

Validate `stageDate`, `progressStatus`, and common status. In a Prisma transaction, when publishing `current`, update other published current items for the same site to `completed` before saving the new item.

- [ ] **Step 4: Implement admin forms and lists**

Build controlled client forms with title, slug, summary/content, category/pinned/status for announcements; and date, stage label, title, summary/content, progress status/order for progress. Show draft/published/archived badges and edit/delete actions.

- [ ] **Step 5: Implement public pages**

Use a shared public feature guard, query `status: 'published'`, and render announcement list/detail and progress timeline. The homepage queries the latest three published announcements and the current published progress item.

- [ ] **Step 6: Verify content isolation and publication**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

Manually verify draft exclusion, duplicate slug rejection, current-progress uniqueness, cross-site ID rejection, and homepage summary updates.

- [ ] **Step 7: Commit announcement/progress**

```powershell
git add src/app/[siteSlug]/admin src/app/api/[siteSlug]/admin/announcement src/app/api/[siteSlug]/admin/progress src/app/(public)/[siteSlug]
git commit -m "feat: add announcement and progress management"
```

---

### Task 5: Exhibition, Meeting, and Vendor Content

**Files:**
- Create: `src/app/api/[siteSlug]/admin/exhibition/route.ts`
- Create: `src/app/api/[siteSlug]/admin/exhibition/[id]/route.ts`
- Create: `src/app/api/[siteSlug]/admin/meeting/route.ts`
- Create: `src/app/api/[siteSlug]/admin/meeting/[id]/route.ts`
- Create: `src/app/api/[siteSlug]/admin/vendors/route.ts`
- Create: `src/app/api/[siteSlug]/admin/vendors/[id]/route.ts`
- Create: `src/app/[siteSlug]/admin/exhibition/page.tsx`
- Create: `src/app/[siteSlug]/admin/exhibition/ExhibitionForm.tsx`
- Create: `src/app/[siteSlug]/admin/meeting/page.tsx`
- Create: `src/app/[siteSlug]/admin/meeting/MeetingForm.tsx`
- Create: `src/app/[siteSlug]/admin/vendors/page.tsx`
- Create: `src/app/[siteSlug]/admin/vendors/VendorForm.tsx`
- Create: `src/app/(public)/[siteSlug]/exhibition/page.tsx`
- Create: `src/app/(public)/[siteSlug]/exhibition/[slug]/page.tsx`
- Create: `src/app/(public)/[siteSlug]/meeting/page.tsx`
- Create: `src/app/(public)/[siteSlug]/vendors/page.tsx`
- Create: `src/app/(public)/[siteSlug]/vendors/[id]/page.tsx`

**Interfaces:**
- All APIs use the same `requireContentPermission` and site-scoped ID checks.
- All attachment writes use `ContentAttachment` and `media.ts`; no route directly writes arbitrary filesystem paths.

- [ ] **Step 1: Implement exhibition API and form**

Validate date ranges, create/update the exhibition row, then replace attachment links in a transaction when the form submits a new ordered media list.

- [ ] **Step 2: Implement meeting API and form**

Validate `meetingType` against `board|general|other`, require `meetingDate` and title, and support one or more PDF attachments. The API must reject image files for meeting minutes unless explicitly marked as an additional image attachment.

- [ ] **Step 3: Implement vendor API and form**

Require vendor name and category, accept optional services/contact fields and logo media, and manage contract attachments through the common attachment API.

- [ ] **Step 4: Implement public rendering**

Render exhibitions with date/location/description/gallery, meetings grouped by meeting type and date, and vendors as cards/detail pages. Each page must call the feature visibility guard before querying content.

- [ ] **Step 5: Verify member visibility**

Manually verify anonymous requests to default member features redirect to the site login; a member sees published content; a member of another site receives 403; disabled features return 404.

- [ ] **Step 6: Commit exhibition/meeting/vendor slice**

```powershell
git add src/app/[siteSlug]/admin src/app/api/[siteSlug]/admin/exhibition src/app/api/[siteSlug]/admin/meeting src/app/api/[siteSlug]/admin/vendors src/app/(public)/[siteSlug]
git commit -m "feat: add exhibition meeting and vendor content"
```

---

### Task 6: Selection, Maps, and File Uploads

**Files:**
- Create: `src/app/api/[siteSlug]/admin/selection/route.ts`
- Create: `src/app/api/[siteSlug]/admin/maps/route.ts`
- Create: `src/app/api/[siteSlug]/admin/maps/[id]/route.ts`
- Create: `src/app/api/[siteSlug]/admin/assets/route.ts`
- Create: `src/app/api/[siteSlug]/admin/assets/[id]/route.ts`
- Create: `src/app/[siteSlug]/admin/selection/page.tsx`
- Create: `src/app/[siteSlug]/admin/selection/SelectionForm.tsx`
- Create: `src/app/[siteSlug]/admin/maps/page.tsx`
- Create: `src/app/[siteSlug]/admin/maps/MapForm.tsx`
- Create: `src/app/(public)/[siteSlug]/selection/page.tsx`
- Create: `src/app/(public)/[siteSlug]/maps/page.tsx`

**Interfaces:**
- Selection is one row per site and uses GET/PATCH only.
- Maps use ordinary collection CRUD and may reference image and download media.
- Upload accepts `multipart/form-data` with `file`, `altText`, and optional `label`.

- [ ] **Step 1: Implement upload route**

Set `export const runtime = 'nodejs'`. Require a site member with write permission, validate MIME and byte size, write to `UPLOAD_DIR`, create the `Media` row, and return a media ID plus URL. On DB failure remove the newly written file.

- [ ] **Step 2: Implement asset deletion**

Require site admin/global admin for deletion, verify `media.siteId`, reject deletion when a `ContentAttachment` or direct content field still references the media, then delete the file and row.

- [ ] **Step 3: Implement selection API/form**

Use `upsert` by `siteId`, validate optional deadline and `http(s)` external URL, and persist status/publishedAt. Do not accept resident IDs, household IDs, selection results, or payment data.

- [ ] **Step 4: Implement maps API/form**

Require title and image or download media, validate same-site media ownership, support category/description/order/status, and clean attachment links on delete.

- [ ] **Step 5: Implement public selection/maps pages**

Render selection information and external link only after the members guard. Render map assets with `altText`, image preview, and permission-checked download links.

- [ ] **Step 6: Verify persisted uploads**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

Upload a valid image and PDF, reject an executable/oversized file, restart the dev server, and confirm the DB URL still resolves to the stored asset. If Docker is available, repeat the persistence check with the Docker data volume.

- [ ] **Step 7: Commit selection/maps/media**

```powershell
git add src/app/[siteSlug]/admin src/app/api/[siteSlug]/admin/selection src/app/api/[siteSlug]/admin/maps src/app/api/[siteSlug]/admin/assets src/app/(public)/[siteSlug]
git commit -m "feat: add selection maps and site media management"
```

---

### Task 7: Navigation, Compatibility, and Seed Migration

**Files:**
- Modify: `src/components/public/SiteHeader.tsx`
- Modify: `src/app/(public)/[siteSlug]/layout.tsx`
- Modify: `src/app/[siteSlug]/admin/layout.tsx`
- Modify: `src/app/(public)/[siteSlug]/page.tsx`
- Modify: `src/app/(dashboard)/sites/page.tsx`
- Modify: `src/app/api/sites/route.ts`
- Modify: `README.md`

- [ ] **Step 1: Update public header**

Use enabled features ordered by `sortOrder`; do not expose disabled features. Keep the site home link separate from the feature list.

- [ ] **Step 2: Add member feature guard to public layout/pages**

For each feature page call `requirePublicFeature(siteSlug, featureKey)` before content queries. Preserve public anonymous rendering for public defaults and site login redirect for member defaults.

- [ ] **Step 3: Remove broken sidebar targets**

Ensure every rendered sidebar href has an implemented admin page. Keep existing member/settings links and do not render old `pages/posts/media` unless a compatibility flag explicitly includes them.

- [ ] **Step 4: Preserve old routes**

Leave `/sites/[id]/pages`, `/sites/[id]/posts`, and their APIs operational. Update site list links to the new `/{slug}/admin` route only where already supported, and do not silently delete old data.

- [ ] **Step 5: Update README**

Document the eight functions, default visibility, content statuses, allowed media types, upload directory, and the fact that formal selection is information-only in this release.

- [ ] **Step 6: Verify navigation**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

Manually check every public and admin href from both desktop and narrow viewport widths.

- [ ] **Step 7: Commit navigation and compatibility**

```powershell
git add src README.md
git commit -m "feat: connect subsite content navigation and compatibility routes"
```

---

### Task 8: Full Verification and Release Readiness

**Files:**
- No new application files unless verification exposes a defect.
- Modify: relevant source file only when fixing a verified issue.

- [ ] **Step 1: Run static verification**

```powershell
npm test
npx prisma validate
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all commands exit with code 0.

- [ ] **Step 2: Run database and seed verification**

```powershell
npx prisma migrate deploy
npx prisma db seed
```

Verify that rerunning seed preserves manually edited `SiteHome`, content, and feature visibility values.

- [ ] **Step 3: Run the permission matrix**

For two sites, verify:

```text
anonymous -> public published content: allowed
anonymous -> member content: site login redirect
member of site A -> site B content: forbidden
global admin -> every admin route: allowed
site admin -> content and feature visibility: allowed
site editor -> content CRUD/publish: allowed
site editor -> members/features: forbidden
site viewer -> read only: allowed
```

- [ ] **Step 4: Run content lifecycle checks**

For each content type, verify create draft, edit draft, publish, render on frontend, unpublish/archive, and delete. Verify homepage latest announcements/current progress update automatically.

- [ ] **Step 5: Run attachment checks**

Verify valid image/PDF upload, invalid MIME rejection, oversized rejection, same-site ownership, permission-checked download, and cleanup after content deletion.

- [ ] **Step 6: Run deployment checks**

```powershell
docker compose config --quiet
```

If Docker is available, verify upload files survive container restart through the existing data volume.

- [ ] **Step 7: Review final diff and status**

```powershell
git diff --check
```

Do not commit secrets, local uploads, generated databases, or unrelated existing worktree files.
