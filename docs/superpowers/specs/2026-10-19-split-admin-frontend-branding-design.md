# 前台與後台圖示分流設計

## 目標

將根目錄上傳的兩張圖檔分別套用到前台子網站與全域後台，讓所有前台子網站使用「都市更新」圖示，後台使用「都更後台」圖示，兩者不再共用同一組 PWA／favicon 資產。

## 範圍

- 前台所有 `/{siteSlug}` 子網站：
  - `都市更新.png` 產生前台 Logo、瀏覽器 icon、Apple icon 與 PWA manifest icons。
  - 前台共用 `SiteHeader` 在站名旁顯示 Logo。
  - 各子網站 manifest 使用前台專屬圖示，但保留目前站名、站色、scope 與 start URL。
- 全域後台 `/admin`：
  - `都更後台.png` 產生後台 favicon、Apple icon 與根 manifest icons。
  - 後台登入頁與全域側欄顯示後台品牌圖示。
  - 保留既有後台功能與導覽圖示，不改變資料庫與權限。
- 不新增資料庫欄位，不改變子網站名稱、顏色、內容或既有圖片資料。

## 資產與產出

將兩張根目錄上傳檔複製到 `assets/branding/` 作為可追蹤來源，並擴充既有 `scripts/generate-icons.mjs` 產生兩套固定尺寸資產：

- 後台：`src/app/icon.png`、`src/app/apple-icon.png`、`public/icons/*`。
- 前台：`public/site-icons/icon-192.png`、`icon-512.png`、`maskable-512.png`、`apple-icon.png`。

前台 header 使用 `/site-icons/icon-512.png`，後台登入頁與側欄使用 `/icons/icon-512.png`。生成器保留白底、現有圓角與 maskable 安全範圍處理，確保圖示在瀏覽器與安裝到主畫面時可辨識。

## 程式設計

- `src/lib/pwa.ts` 分別匯出後台與前台的 manifest icon 清單；根 manifest 使用後台清單，子網站 manifest 使用前台清單。
- `src/app/(public)/[siteSlug]/layout.tsx` 的 metadata 增加前台 icon 與 Apple icon，並維持子網站專屬 manifest。
- `src/components/public/SiteHeader.tsx` 增加前台 Logo，使用站名作為文字替代資訊。
- `src/components/Sidebar.tsx` 的全域後台品牌區增加後台 Logo；巢狀子網站管理頁仍維持站名與專案後台文字。
- `src/app/(auth)/admin/login/page.tsx` 在登入標題上方增加後台 Logo。

## 測試與驗證

- 先新增會因圖示清單仍共用、Logo 尚未渲染而失敗的測試。
- 驗證根 manifest 使用後台 icons，子網站 manifest 使用前台 icons。
- 驗證前台 header、後台登入頁、全域側欄引用正確資產路徑。
- 執行相關 Vitest、完整測試、TypeScript、lint、production build，並檢查生成資產尺寸與 `git diff --check`。

