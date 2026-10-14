# 選配作業多筆管理與媒體 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將子網站「選配作業」從單筆表單擴充為可新增、編輯、刪除多筆資料，並支援文件下載和圖片展示。

**Architecture:** 延用 `SelectionInfo` 與既有資料，以 SQLite migration 移除 `siteId` 唯一限制並補上建立時間。使用現有 `ContentAttachment` 關聯選配項目與同站媒體；新增集合／單筆 API，後台管理列表與表單，前台只呈現已發布項目及其附件。

**Tech Stack:** Next.js App Router、React、Prisma、SQLite、既有 `Media`/`ContentAttachment`、Vitest。

**Spec:** `docs/superpowers/specs/2026-09-23-subsite-content-management-design.md`（第 6.8、7.4 節）

## Global Constraints

- 沿用既有媒體上傳驗證：只接受已允許的 PDF 與圖片類型、10 MB 上限。
- 每個附件媒體必須屬於同一個子網站；依站點功能可見性執行前台媒體存取控制。
- 只有已發布的選配項目及附件可在前台顯示。
- 不實作住戶、戶別、個人選配結果、志願提交或抽籤資料。
- 刪除選配項目時，刪除其 `ownerType = "selection"` 附件關聯，不刪共用媒體檔案。

## Review Focus

- 舊資料遷移後必須原樣保留，且允許同一站點新增第二筆資料；migration task 驗證。
- 跨站媒體 ID 不得被選配附件關聯；API task 驗證。
- 刪除資料不可連帶刪除媒體檔案或其他內容的附件關聯；API task 驗證。
- 草稿／封存資料與未被已發布選配項目引用的媒體不得由公開頁面洩露；媒體可見性 task 驗證。
- 空附件、PDF、圖片及無效 ID 的表單/API 處理須穩定；表單與 API task 驗證。

---

### Task 1: 多筆資料模型與向前相容 Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_selection_items/migration.sql`
- Test: migration verification using the project SQLite database/test workflow

**Interfaces:**
- Produces: `SelectionInfo` 多筆站點資料模型，含 `createdAt`，以 `siteId` 非唯一索引查詢。
- Existing `SelectionInfo` rows retain their IDs and all content/status fields.

- [x] **Step 1: Write migration regression test/check**

Verify fixture DB with one existing selection row retains every field and ID after migration, and accepts a second row with the same `siteId`.

- [x] **Step 2: Run check and verify it fails against current unique constraint**

- [x] **Step 3: Update Prisma model and create migration**

Preserve the existing table/model name to avoid unnecessary rename; drop the unique `siteId` constraint, add `createdAt` with a safe default for old rows, and create a non-unique `siteId` index.

- [x] **Step 4: Regenerate Prisma client and verify migration**

Run: `npx prisma generate` and the repository's migration test/check.
Expected: old row is preserved and another row for the same site can be inserted.

### Task 2: Selection Collection and Item APIs

**Files:**
- Modify: `src/app/api/[siteSlug]/admin/selection/route.ts`
- Create: `src/app/api/[siteSlug]/admin/selection/[id]/route.ts`
- Test: `src/app/api/[siteSlug]/admin/selection/route.test.ts`
- Test: `src/app/api/[siteSlug]/admin/selection/[id]/route.test.ts`

**Interfaces:**
- Collection: `GET` lists site selections with attachments; `POST` creates one.
- Item: `PATCH` updates one site-owned selection; `DELETE` deletes the item and its selection attachment links.
- Attachment payload: ordered `{ mediaId, label? }[]`; validate media ownership before replacing links.

- [x] **Step 1: Add failing collection tests**

Assert GET site scoping/order; POST creates valid row with draft default and attachments; rejects missing title and foreign-site media; preserves existing partial-update behavior only at item endpoint.

- [x] **Step 2: Run selection API tests and verify expected failures**
- [x] **Step 3: Implement collection GET/POST and attachment validation**

Use `requireContentPermission` read/write, existing text/status/URL validators, and a transaction for row plus attachment writes. Use `ownerType: 'selection'`.

- [x] **Step 4: Add failing item PATCH/DELETE tests**

Assert site ownership (404 for foreign or missing IDs), partial field updates, status/publishedAt semantics, delete permission, and deletion of only this item's attachment links.

- [x] **Step 5: Implement item PATCH/DELETE**
- [x] **Step 6: Run both API test files and verify they pass**

### Task 3: Admin Multi-item Management UI

**Files:**
- Modify: `src/app/[siteSlug]/admin/selection/page.tsx`
- Create: `src/app/[siteSlug]/admin/selection/SelectionManager.tsx`
- Create: `src/app/[siteSlug]/admin/selection/[id]/edit/page.tsx`
- Create: `src/app/[siteSlug]/admin/selection/new/page.tsx`
- Create or refactor: `src/app/[siteSlug]/admin/selection/SelectionForm.tsx`
- Test: existing admin/component test conventions for selection manager/form

**Interfaces:**
- Manager consumes site slug, role permissions and selection list; links to create/edit and invokes item DELETE.
- Form consumes optional existing item and media picker results; submits selection fields and ordered attachment IDs.

- [x] **Step 1: Add UI tests for empty/list states, create/edit fields, permissions and confirmed deletion**
- [x] **Step 2: Run tests and verify the new cases fail**
- [x] **Step 3: Implement manager, create/edit routes and attachment picker**

Reuse existing media library/upload interaction and project admin patterns; let users select uploaded PDFs/images, edit attachment labels/order, and preview selected images in the form.

- [x] **Step 4: Verify editor/viewer/delete permission behavior**

Readers see the list but cannot mutate; write permission controls add/edit; delete permission controls delete.

- [x] **Step 5: Run selection UI tests and typecheck**

### Task 4: Public Published Selection Items, Downloads and Images

**Files:**
- Modify: `src/app/(public)/[siteSlug]/selection/page.tsx`
- Modify: `src/lib/mediaAccess.ts`
- Test: `src/app/(public)/[siteSlug]/selection/page.test.tsx` (or nearest established route test location)
- Test: `src/lib/mediaAccess.test.ts`

**Interfaces:**
- Query published selections for the site ordered by creation/update time and include ordered attachment media.
- Render PDF/other permitted documents as labeled download links and images as responsive images with `altText`.

- [x] **Step 1: Add failing public page tests**

Assert published items render, files link to their media URL, images include alt text, and draft/archived rows are absent.

- [x] **Step 2: Run test and verify it fails**
- [x] **Step 3: Implement published item query and attachment rendering**

Keep `requirePublicFeature` and rely on existing `/uploads/[filename]` visibility checks; render empty-state copy when no published item exists.

- [x] **Step 4: Add media visibility tests for published selection attachments**

Assert selection attachments mark the media public/member according to the site's `selection` feature visibility only when the owning selection is published.

- [x] **Step 5: Verify existing `src/lib/mediaAccess.ts` selection support for member-only and public visibility, including image/download access**
- [x] **Step 6: Run selection route tests and full verification**

Run: `npx prisma validate`, `npx tsc --noEmit`, `npm run lint`, and `npm test` (or the repository's supported equivalent).
Expected: all commands pass; migration retains existing selection content.

### Task 5: Rename the Feature to「選配作業」

**Files:**
- Modify: `src/lib/features.ts`
- Modify: `src/app/[siteSlug]/admin/selection/page.tsx`
- Modify: `src/app/(public)/[siteSlug]/selection/page.tsx`
- Modify: `src/app/[siteSlug]/admin/selection/SelectionForm.tsx`
- Test: feature label and selection-page UI tests

- [x] **Step 1: Add or update assertions for the admin navigation label and page headings/default title**
- [x] **Step 2: Change user-visible labels to「選配作業」**

Keep the internal key `selection`, route segments, Prisma model and API paths unchanged for compatibility.

- [x] **Step 3: Run feature and selection UI tests**

### Task 6: Update User-facing Documentation

**Files:**
- Modify: `README.md`

- [x] **Step 1: Update the selection feature description**

Document the 「選配作業」 label, multiple entries, per-entry create/edit/delete, attached document downloads, image display, and information-only scope.

- [x] **Step 2: Review wording against shipped behavior and verify no line implies online resident selection**
