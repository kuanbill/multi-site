# Responsive Admin GUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓全域後台與子網站後台在手機、平板與桌面寬度下都能有效導覽、瀏覽資料及完成表單操作。

**Architecture:** 以共用 `AdminShell`、`Sidebar`、`Header` 作為響應式基礎；資料列表依內容密度採用可橫向滑動表格或手機卡片；表單沿用現有 Tailwind utility 與 admin 欄位元件，透過 breakpoint 與可換行操作列改善窄螢幕，不改變 API、路由或權限邏輯。

**Tech Stack:** Next.js 16 App Router、React、Tailwind CSS v4、Vitest、TypeScript。

**Spec:** 本次對話中的「後台 GUI 三階段優化」規劃。

## Global Constraints

- 不新增 npm 套件、Prisma model 或 migration。
- 不改變既有後台路由、API、登入 session、權限與資料行為。
- 支援 320px、375px、768px、1024px 寬度；不得以固定寬度造成主要內容被裁切。
- 觸控操作目標以至少 44px 高度為準；icon-only 控制必須有 `aria-label` 與 tooltip。
- 保留目前 Sidebar 收合狀態的 localStorage 行為。

## Review Focus

- 320px 寬度下側邊欄抽屜開啟、關閉及主要內容不可被遮蔽；由 Task 1 的 shell 測試驗證。
- 收合後所有導覽項目仍可由鍵盤及螢幕閱讀器辨識；由 Task 1 的 Sidebar 測試驗證。
- 多欄表格在手機不會把操作按鈕推出可視區；由 Task 2 的列表測試與 `overflow-x-auto` 檢查驗證。
- 長網站名稱、email、功能名稱在平板不會破壞操作列；由 Task 2 的卡片／表格測試驗證。
- 表單操作列與媒體選擇器在 320px 可換行且按鈕仍可觸控；由 Task 3 的表單 contract 測試驗證。

---

### Task 1: Responsive admin shell and navigation

**Files:**
- Create: `src/components/AdminShell.tsx` (目前未提交的收合 shell，補上手機抽屜狀態)
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/layout.tsx`
- Test: `src/components/Sidebar.test.tsx`
- Test: `src/components/AdminShell.test.tsx`

**Interfaces:**
- Consumes: `Sidebar` 的 `collapsed`, `onToggle`, `siteSlug`, `features` props。
- Produces: `AdminShell` 統一管理 `collapsed`, `mobileOpen` 與 `admin-sidebar-collapsed` localStorage key。

- [x] **Step 1: 保留並確認 Sidebar 收合測試**

  測試 collapsed／expanded 的按鈕 accessible name、icon-only tooltip、`sr-only` label 與 `w-20`／`w-64` 狀態。

- [x] **Step 2: 執行 Sidebar 測試確認目前收合功能通過**

  Run: `npx vitest run src/components/Sidebar.test.tsx`

- [x] **Step 3: 新增 mobile drawer 的 failing tests**

  驗證 320px 模式有開啟／關閉控制、遮罩、Escape 關閉，以及 drawer 關閉時不攔截主要內容。

- [x] **Step 4: 完成 AdminShell mobile state**

  `AdminShell` 增加 `mobileOpen`，桌面使用收合寬度，窄螢幕使用 sidebar drawer；Sidebar 以 `translate-x` 與遮罩呈現，所有 transition 限定在 transform、width、margin，並尊重 reduced motion。

- [x] **Step 5: 調整 Header 與兩個 admin layout**

  Header 在窄螢幕允許內容換行；共用 shell 使用 `ml-0 sm:ml-20 lg:ml-64` 等 responsive layout，保留全域與子網站 session／權限流程。

- [x] **Step 6: 執行 Task 1 驗證**

  Run: `npx vitest run src/components/Sidebar.test.tsx src/components/AdminShell.test.tsx && npx tsc --noEmit`

---

### Task 2: Responsive data lists

**Files:**
- Modify: `src/app/admin/sites/page.tsx`
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/users/SiteUsersClient.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/media/MediaLibrary.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/page.tsx`
- Test: existing list tests where available; add focused static contract assertions beside affected components when no renderer exists。

**Interfaces:**
- Consumes: Task 1 responsive content shell。
- Produces: 手機可閱讀的子網站、使用者、成員、媒體與紀錄列表；桌面維持表格資訊密度。

- [x] **Step 1: 寫 failing responsive list assertions**

  驗證主要 table 外層具備 `overflow-x-auto` 或 mobile card fallback、操作列具備 `flex-wrap`，並確認長 email／名稱有 `break-words` 或可安全截斷且可取得完整值。

- [x] **Step 2: 調整全域子網站與使用者列表**

  桌面保留 table；手機將欄位與操作改為可堆疊／換行的 row，按鈕維持至少 44px 高度。

- [x] **Step 3: 調整子網站成員、媒體與儀表板紀錄**

  成員與媒體資料使用可滑動表格或卡片分組；登入／瀏覽紀錄在窄螢幕允許欄位滾動，不讓日期、email 或操作按鈕擠壓內容。

- [x] **Step 4: 執行 Task 2 驗證**

  Run: `npm test`，並以 `git diff --check` 檢查所有列表修改。

---

### Task 3: Responsive forms and touch actions

**Files:**
- Modify: `src/components/admin/Input.tsx`
- Modify: `src/components/admin/Select.tsx`
- Modify: `src/components/admin/TextArea.tsx`
- Modify: `src/components/admin/DateInput.tsx`
- Modify: `src/components/admin/NumberInput.tsx`
- Modify: `src/components/admin/Checkbox.tsx`
- Modify: `src/app/admin/users/UserForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/home/HomeForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/announcement/AnnouncementForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/exhibition/ExhibitionForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/meeting/MeetingForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/progress/ProgressForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/selection/SelectionForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/vendors/VendorForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/maps/MapForm.tsx`
- Modify: `src/app/admin/sites/[siteSlug]/[...featureRoute]/FeatureEntryForm.tsx`
- Test: focused form contract tests for shared field controls and action rows。

**Interfaces:**
- Consumes: Task 1 shell spacing and Task 2 list action sizing。
- Produces: 320px 可完成的輸入、選擇、媒體挑選與儲存／取消／刪除流程。

- [x] **Step 1: 寫 failing form responsive assertions**

  驗證共用輸入控制具備至少 `min-h-11`／等效觸控高度；表單 grid 在窄螢幕為單欄；操作列使用 `flex-wrap`。

- [x] **Step 2: 統一 shared admin field controls**

  將 Input、Select、TextArea、DateInput、NumberInput、Checkbox 的尺寸、focus ring 與 label spacing 統一，不能破壞既有 error／hint／disabled 狀態。

- [x] **Step 3: 調整各類內容表單**

  將現有固定 min-width、三欄 grid、媒體選擇器與操作按鈕改為 responsive utility；手機上主要提交按鈕滿寬或與次要按鈕自然換行。

- [x] **Step 4: 執行 Task 3 驗證**

  Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`

---

### Task 4: Whole-feature verification

**Files:**
- Verify only; no source changes unless a regression is found。

- [x] **Step 1: 檢查 diff 與 route integrity**

  Run: `git diff --check` and `npm test`。

- [x] **Step 2: 執行 typecheck、lint、build**

  Run: `npx tsc --noEmit && npm run lint && npm run build`。

- [ ] **Step 3: 手動檢查響應式狀態**

  使用 local production server 檢查 320px、375px、768px、1024px 的全域後台、子網站後台、列表與表單；確認鍵盤可開關 Sidebar、Escape 可關閉 drawer、內容沒有不必要的水平溢出。

- [x] **Step 4: 回報未部署狀態**

  本次只完成 GUI 程式碼與本機驗證；正式 Docker 部署需另行明確要求。
