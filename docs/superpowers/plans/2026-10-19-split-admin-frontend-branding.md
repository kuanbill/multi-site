# 前台與後台圖示分流 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 使用 `都市更新.png` 作為所有前台子網站的 Logo／favicon／PWA 圖示，使用 `都更後台.png` 作為全域後台的品牌圖示，並保留前後台資產分離。

**Architecture:** 將兩張上傳圖複製到 `assets/branding/` 作為生成來源，擴充現有 icon 生成器輸出後台與前台兩套固定尺寸 PNG。根 manifest、後台 UI 與 Next app icon 使用後台資產；子網站 layout、SiteHeader 與子網站 manifest 使用前台資產。

**Tech Stack:** Next.js 16.3.5、React 19、TypeScript、Vitest、Sharp、Next Metadata／Manifest。

## Global Constraints

- 不新增 Prisma schema、migration 或資料庫欄位。
- 後台 `src/app/icon.png`、`src/app/apple-icon.png`、`public/icons/*` 使用 `都更後台.png` 生成。
- 前台 `public/site-icons/*` 使用 `都市更新.png` 生成。
- 後台與前台保留不同的 manifest icon constants；不得再共用同一個 icon array。
- 保留既有子網站名稱、主色、manifest scope、start URL 與權限行為。
- 不納入 `docs/ssh-production-deployment-guide.docx` 或其他未相關未追蹤檔案。

---

### Task 1: 建立雙來源圖示生成流程

**Files:**
- Create: `assets/branding/site-icon-source.png`（由根目錄 `都市更新.png` 複製）
- Create: `assets/branding/admin-icon-source.png`（由根目錄 `都更後台.png` 複製）
- Modify: `scripts/generate-icons.mjs`
- Modify: `README.md`
- Test: `public/site-icons/icon-192.png`、`public/site-icons/icon-512.png`、`public/site-icons/maskable-512.png`、`public/site-icons/apple-icon.png` 及既有後台產出

**Interfaces:**
- Produces a deterministic `npm run icons` command that generates admin outputs under `src/app` and `public/icons`, and site outputs under `public/site-icons`.
- Keeps the existing white-background, rounded-icon, maskable-safe-area behavior for both source images.

- [ ] **Step 1: Copy the uploaded source images into tracked branding assets.**

```powershell
New-Item -ItemType Directory -Force assets/branding | Out-Null
Copy-Item -LiteralPath '都市更新.png' -Destination 'assets/branding/site-icon-source.png' -Force
Copy-Item -LiteralPath '都更後台.png' -Destination 'assets/branding/admin-icon-source.png' -Force
```

- [ ] **Step 2: Refactor the icon generator around an explicit icon-set configuration.**

Change the single `sourcePath` constant into two configurations:

```js
const iconSets = [
  {
    name: 'admin',
    sourcePath: path.join(root, 'assets', 'branding', 'admin-icon-source.png'),
    appDir,
    pwaIconDir,
  },
  {
    name: 'site',
    sourcePath: path.join(root, 'assets', 'branding', 'site-icon-source.png'),
    appDir: null,
    pwaIconDir: path.join(root, 'public', 'site-icons'),
  },
];
```

Make `detectContentBox`, `buildIcon`, and `buildMaskableIcon` accept `sourcePath`, then generate 192px, 512px, maskable 512px, and 180px Apple outputs for each set. Write the admin 180px file to `src/app/apple-icon.png`; write the site 180px file to `public/site-icons/apple-icon.png`. Keep `src/app/icon.png` as the admin 512px output and keep `/icons/*` as the admin PWA output.

- [ ] **Step 3: Regenerate both asset sets.**

Run: `npm run icons`

Expected: the command reports both source images and writes all admin and site outputs without errors.

- [ ] **Step 4: Update the icon documentation.**

Replace the README statement that one source is shared with the two source paths and explain that `npm run icons` generates separate admin (`src/app`, `public/icons`) and frontend (`public/site-icons`) outputs.

- [ ] **Step 5: Verify generated dimensions.**

Run a Node/Sharp metadata check for these files:

```text
src/app/icon.png                         512x512
src/app/apple-icon.png                   180x180
public/icons/icon-192.png                192x192
public/icons/icon-512.png                512x512
public/icons/maskable-512.png            512x512
public/site-icons/icon-192.png           192x192
public/site-icons/icon-512.png           512x512
public/site-icons/maskable-512.png       512x512
public/site-icons/apple-icon.png         180x180
```

### Task 2: Split PWA metadata and manifest contracts

**Files:**
- Modify: `src/lib/pwa.ts`
- Modify: `src/lib/pwa.test.ts`
- Modify: `src/app/manifest.ts`
- Modify: `src/app/manifest.test.ts`
- Modify: `src/app/[siteSlug]/manifest.webmanifest/route.test.ts`

**Interfaces:**
- Produces `ADMIN_PWA_ICONS` for `/icons/*` and `SITE_PWA_ICONS` for `/site-icons/*`.
- `buildSiteManifest(site)` returns `SITE_PWA_ICONS`; root `manifest()` returns `ADMIN_PWA_ICONS`.

- [ ] **Step 1: Add failing tests.**

Add assertions that the two arrays are different and have exact paths:

```ts
expect(ADMIN_PWA_ICONS).toEqual([
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]);
expect(SITE_PWA_ICONS).toEqual([
  { src: '/site-icons/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/site-icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  { src: '/site-icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]);
expect(buildSiteManifest(site).icons).toBe(SITE_PWA_ICONS);
```

Run: `npm exec vitest run src/lib/pwa.test.ts src/app/manifest.test.ts "src/app/[siteSlug]/manifest.webmanifest/route.test.ts"`

Expected: FAIL because the implementation currently exposes one shared icon array and points the site manifest to `/icons/*`.

- [ ] **Step 2: Implement the split constants and consumers.**

Export the two arrays, use `ADMIN_PWA_ICONS` in `src/app/manifest.ts`, and use `SITE_PWA_ICONS` in `buildSiteManifest`.

- [ ] **Step 3: Run the focused manifest tests.**

Run the same Vitest command and expect all tests to pass.

### Task 3: Add frontend and backend visible branding

**Files:**
- Modify: `src/app/(public)/[siteSlug]/layout.tsx`
- Modify: `src/components/public/SiteHeader.tsx`
- Create: `src/components/public/SiteHeader.test.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/Sidebar.test.tsx`
- Modify: `src/app/(auth)/admin/login/page.tsx`
- Modify: `src/app/admin/responsiveGuiContracts.test.ts`

**Interfaces:**
- Frontend header renders `/site-icons/icon-512.png` next to the site name with an accessible `alt` strategy.
- Global admin sidebar and admin login render `/icons/icon-512.png`; nested site-admin sidebar remains site-specific.
- Public layout metadata exposes `/site-icons/icon-512.png` as `icon` and `/site-icons/apple-icon.png` as `apple`.

- [ ] **Step 1: Add failing UI contract tests.**

Add a `SiteHeader` static-render test expecting `src="/site-icons/icon-512.png"` and the site name, and extend the sidebar/contract tests to expect `/icons/icon-512.png` in the global admin view and `/site-icons/icon-512.png` in the public header. Add source assertions for the public layout metadata paths and admin login branding if static rendering is not practical.

- [ ] **Step 2: Run the focused UI tests to verify RED.**

Run: `npm exec vitest run src/components/public/SiteHeader.test.tsx src/components/Sidebar.test.tsx src/app/admin/responsiveGuiContracts.test.ts`

Expected: FAIL because neither header currently renders the requested image paths.

- [ ] **Step 3: Implement the minimum visible branding changes.**

Use the generated frontend icon in `SiteHeader`, add the generated admin icon above the admin login heading, add the generated admin icon beside the global sidebar title, and set public nested metadata icon entries without changing route behavior.

- [ ] **Step 4: Run focused UI tests to verify GREEN.**

Run the same Vitest command and expect all tests to pass.

### Task 4: Full verification and handoff

**Files:**
- Verify only; no additional source files expected.

- [ ] **Step 1: Run the complete test suite.**

Run: `npm test`

Expected: all test files and tests pass.

- [ ] **Step 2: Run type checking and lint.**

Run: `npx tsc --noEmit` and `npm run lint`

Expected: TypeScript exits 0; lint has no errors (existing warnings may remain).

- [ ] **Step 3: Build production output.**

Run: `npm run build`

Expected: production build exits 0; existing dynamic filesystem tracing warnings may remain.

- [ ] **Step 4: Check the final diff and tracked scope.**

Run: `rtk git diff --check` and `rtk git status --short`

Expected: no whitespace errors; only branding source/assets, generator, metadata/UI/tests/docs are changed, and existing unrelated untracked files remain unstaged.

