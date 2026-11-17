# 子網站管理者權限 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將全域 `editor` 角色改為「子網站管理者」，要求指定一個子網站，並讓該使用者只能完整管理指定子網站。

**Architecture:** 沿用現有 `User.role`、`User.allSites` 與 `SiteUser` 資料模型，讓 `editor` 的指定 `SiteUser` 固定為站內 `admin`。後台登入與所有子網站頁面／API 共用伺服器端站點存取判定；全域管理路由另外限制為 `admin`。

**Tech Stack:** Next.js 16 App Router、NextAuth JWT、Prisma SQLite、TypeScript、Vitest。

**Spec:** `docs/superpowers/specs/2026-11-17-site-manager-design.md`

## 完成狀態

- 狀態：已完成、已合併並部署至正式環境。
- 實作提交：
  - `08702cf`：後台登入、站點上下文、Proxy 與媒體權限隔離。
  - `facad8a`：全域路由與角色感知導覽隔離。
  - `051904f`：使用者 API 與表單要求指定單一子網站。
  - `b18dd20`：補強 stale JWT、membership 即時撤銷、多筆 membership 與 PATCH 繞過防護。
- 合併結果：PR #2 已合併至 `main`，merge commit 為 `b06e898`。
- 驗證結果：98 個測試檔、495 個測試全數通過；正式 Docker build、Next.js 編譯與 TypeScript 檢查成功。
- 正式部署：2026-11-17 部署完成；Prisma 14 個 migrations 均為最新，`multi-site-app` 為 `healthy`，正式 HTTPS 跟隨登入導向後回應 `200`。

## Global Constraints

- `editor` 程式值不變，顯示名稱固定為「子網站管理者」。
- 子網站管理者必須指定一個子網站，且 `SiteUser.role` 固定為 `admin`。
- 子網站管理者不得使用全域儀表板、子網站管理、使用者管理或功能選單。
- 既有 `allSites=true` 的 `editor` 不再取得不設限授權，必須重新指定子網站。
- 不新增資料庫欄位或依賴套件。

## Review Focus

- 未指定子網站的 `editor` 嘗試登入：應被拒絕，不能進入全域後台。
- 已登入的子網站管理者直接輸入其他子網站 URL 或呼叫 API：應被拒絕。
- 子網站管理者直接呼叫全域使用者／子網站 API：應回傳 403。
- 編輯既有使用者由 `editor` 改成其他角色：應清除站點範圍與 memberships。
- 既有 `allSites=true` 使用者：不能因舊旗標繼續取得所有子網站權限。

---

### Task 1: 角色標籤與伺服器端站點權限

**Files:**
- Modify: `src/lib/roles.ts`
- Modify: `src/lib/adminAuth.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/contentAccess.ts`
- Modify: `src/lib/siteAuth.ts`
- Modify: `src/proxy.ts`
- Modify: `src/app/uploads/[filename]/route.ts`
- Test: `src/lib/adminAuth.test.ts`
- Test: `src/lib/auth.test.ts`
- Test: `src/lib/contentAccess.guard.test.ts`
- Test: `src/proxy.test.ts`
- Test: `src/app/uploads/[filename]/route.test.ts`

**Interfaces:**
- Produces `getAdminSession()` for authenticated `admin` and assigned `editor` users.
- Produces a global-admin-only guard used by global admin pages and APIs.
- Produces `requireSiteContext(siteSlug)` that returns `global-admin` for admins and the actual `SiteUser.role` for assigned editors.

- [x] **Step 1: Write failing tests**
  - Assert `roleLabel('editor')` is `子網站管理者`.
  - Assert admin authentication accepts an `editor` with a valid site membership and rejects an editor with no membership or only `allSites=true`.
  - Assert `requireSiteContext` returns the assigned membership role for an editor and redirects when the site is not assigned.
  - Assert proxy decisions allow an authenticated editor token through `/admin/sites/{assigned}/...` but deny global admin APIs and unassigned site paths.
  - Assert upload access no longer treats `allSites=true` as membership.

- [x] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- src/lib/adminAuth.test.ts src/lib/auth.test.ts src/lib/contentAccess.guard.test.ts src/proxy.test.ts src/app/uploads/[filename]/route.test.ts`

Expected: FAIL because admin authentication only accepts `admin`, site context always returns `global-admin`, and `allSites` still bypasses membership.

- [x] **Step 3: Implement the permission boundary**
  - Change the role label only; retain the `editor` value.
  - Extend the admin JWT/session with site memberships and allow `admin` or assigned `editor` authentication.
  - Add a global-admin-only helper and use database membership checks for editor access.
  - Make `requireSiteContext` resolve the actual site role and reject unassigned editors.
  - Update proxy decisions so editor admin sessions can reach site-admin paths but not global paths.
  - Remove `allSites` as an authorization bypass while retaining the field for compatibility.

- [x] **Step 4: Run the focused tests and verify they pass**

Run: `npm test -- src/lib/adminAuth.test.ts src/lib/auth.test.ts src/lib/contentAccess.guard.test.ts src/proxy.test.ts src/app/uploads/[filename]/route.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/lib/roles.ts src/lib/adminAuth.ts src/lib/auth.ts src/lib/contentAccess.ts src/lib/siteAuth.ts src/proxy.ts "src/app/uploads/[filename]/route.ts" src/lib/adminAuth.test.ts src/lib/auth.test.ts src/lib/contentAccess.guard.test.ts src/proxy.test.ts "src/app/uploads/[filename]/route.test.ts"
git commit -m "feat: enforce site manager access boundaries"
```

### Task 2: 後台導覽與全域路由隔離

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/sites/page.tsx`
- Modify: `src/app/admin/features/page.tsx`
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/users/new/page.tsx`
- Modify: `src/app/admin/users/[id]/edit/page.tsx`
- Modify: `src/components/AdminShell.tsx`
- Modify: `src/components/Sidebar.tsx`
- Test: `src/lib/adminRouteContract.test.ts`
- Test: `src/app/admin/responsiveGuiContracts.test.ts`

**Interfaces:**
- Consumes the session and site context guards from Task 1.
- Produces a site-manager shell with only the assigned site navigation.

- [x] **Step 1: Write failing tests**
  - Assert site-manager navigation does not render global management links.
  - Assert the site navigation does not expose a return link to the unrestricted site list for an editor.
  - Assert global pages reject editor sessions or redirect them to their assigned site.

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/adminRouteContract.test.ts src/app/admin/responsiveGuiContracts.test.ts`

Expected: FAIL because the current layout accepts only global admin sessions and the sidebar always renders global navigation or an unrestricted site-list link.

- [x] **Step 3: Implement route and navigation isolation**
  - Redirect an editor landing on `/admin` to the assigned site dashboard.
  - Apply the global-admin-only guard to dashboard, site list, feature list, and user-management pages.
  - Pass role-aware navigation state through `AdminShell` and `Sidebar`.
  - Render only the assigned site menu for an editor and retain all global menu items for an admin.

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/adminRouteContract.test.ts src/app/admin/responsiveGuiContracts.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/admin src/components/AdminShell.tsx src/components/Sidebar.tsx src/lib/adminRouteContract.test.ts src/app/admin/responsiveGuiContracts.test.ts
git commit -m "feat: limit site manager admin navigation"
```

### Task 3: 使用者管理指定子網站

**Files:**
- Modify: `src/app/admin/users/UserForm.tsx`
- Modify: `src/app/admin/users/[id]/edit/page.tsx`
- Modify: `src/app/api/admin/users/route.ts`
- Modify: `src/app/api/admin/users/[id]/route.ts`
- Modify: `src/app/admin/users/page.tsx`
- Test: `src/app/api/admin/users/route.test.ts`
- Test: `src/app/api/admin/users/[id]/route.test.ts`
- Test: `src/components/admin/responsiveFormContracts.test.ts`

**Interfaces:**
- Consumes global-admin-only access from Task 1 and the role label from `roles.ts`.
- Produces user records where an `editor` has exactly one `SiteUser` with `role: 'admin'`.

- [x] **Step 1: Write failing tests**
  - Assert POST rejects an `editor` without `siteId`.
  - Assert POST creates an editor membership with `role: 'admin'`.
  - Assert PUT replaces the previous membership with the selected site and `role: 'admin'`.
  - Assert changing an editor to another global role clears `allSites` and all site memberships.
  - Assert `allSites: true` is rejected for new and edited editors.
  - Assert the form shows the label 「子網站管理者」, requires a selected site for editor, and no longer offers 「不設限（所有子網站）」 or a disabled `viewer` selector.

- [x] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/admin/users/route.test.ts src/app/api/admin/users/[id]/route.test.ts src/components/admin/responsiveFormContracts.test.ts`

Expected: FAIL because the API writes `viewer`, accepts a missing site, and the form hardcodes the disabled viewer role.

- [x] **Step 3: Implement the user-management contract**
  - Require exactly one valid site for `editor`; set `allSites` false.
  - Create or replace the membership with `role: 'admin'`.
  - Clear memberships whenever the user is changed to `admin` or `viewer`.
  - Remove the unlimited option and present the selected site as the editor's management scope.
  - Load the existing membership for the selected site in edit mode.
  - Update user-list wording to show the new role label and assigned site.

- [x] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/app/api/admin/users/route.test.ts src/app/api/admin/users/[id]/route.test.ts src/components/admin/responsiveFormContracts.test.ts`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/admin/users src/app/api/admin/users src/components/admin/responsiveFormContracts.test.ts
git commit -m "feat: assign site manager to one site"
```

### Task 4: 完整驗證與安全回歸

**Files:**
- Modify: affected tests from Tasks 1-3 only if regression fixes are required.
- Test: full existing test suite and production build.

- [x] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all test files and tests pass.

- [x] **Step 2: Run type checking**

Run: `npx tsc --noEmit`

Expected: exit code 0 with no TypeScript errors.

- [x] **Step 3: Run lint and production build**

Run: `npm run lint`

Expected: exit code 0; existing warnings may remain, but no errors.

Run: `npm run build`

Expected: production build completes successfully.

- [x] **Step 4: Review the final diff**

Run: `git diff --check` and `git status --short`

Expected: no whitespace errors; unrelated existing untracked files remain untouched.
