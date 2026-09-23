# Task 7：導覽、相容性與種子預設執行報告

## 結果

Task 7 已完成。站點公開導覽依啟用狀態和 `sortOrder` 顯示功能，站名首頁連結保持獨立；站點後台側欄僅列出有實作管理頁面的七項內容功能，並保留首頁、成員、功能設定、站點儀表板及全域選單連結。

## 實作內容

- `src/lib/site.ts`：啟用功能資料保留 `enabled` 與站點 `sortOrder`；新增公開導覽排序及停用項目過濾。
- `src/components/public/SiteHeader.tsx`：導覽依啟用狀態和排序呈現，站名首頁連結獨立於功能清單。
- `src/lib/features.ts`、`src/components/Sidebar.tsx`：站點側欄只使用具有對應後台頁面的系統功能，不產生舊版 pages/posts/media 或未知功能路徑。
- 舊前台 `/[siteSlug]/pages`、`/pages/[pageSlug]`、`/posts`、`/posts/[postSlug]` 改用 `requirePublicFeature`。公開舊文章列表和明細只查詢 `published: true`；原頁面與文章資料模型沒有草稿狀態欄位，既有頁面仍照舊可讀，且受 pages 功能可見性控制。
- `src/lib/seedDefaults.ts`、`src/app/api/sites/route.ts`：新站建立的功能關聯使用功能目錄預設可見性；保留舊 pages/posts/media 的啟用預設，四項會員功能明確設為 `members`，新內容功能維持停用待站點設定。
- `/sites/[id]/pages`、`/sites/[id]/posts` 舊管理列表及對應 API 未刪除或改動；站點清單原有 `/{slug}/admin` 入口保持可用。
- `README.md`：新增首頁設定及七項內容功能說明、預設可見性、內容狀態、10 MB 媒體上限與允許的 PDF/圖片 MIME 類型、預設 `data/uploads/` 及 `UPLOAD_DIR` 設定，並標示正式選配在此版本僅為資訊公告用途。
- 未修改 `requirePublicFeature` 或媒體下載 guard，Task 6 的直接媒體可見性檢查保持原狀。

## 驗證

- `npm test`：通過，8 個測試檔、29 個測試。
- `npx tsc --noEmit`：通過。
- `npm run lint`：通過，0 errors；輸出 6 個原有未使用 catch 參數 warnings，位於邀請 API、舊 pages/posts APIs、舊 site API 與新站 API catch 區塊。
- `git diff --check`：通過；僅出現 Windows 換行格式提示。
- 已讀取 Next.js 16.3.5 的 project structure、layouts/pages、linking/navigation 與 route handlers 文件。路由使用既有 App Router 目錄結構，沒有新增或搬移 route handler。
- 以程式碼盤點確認 Sidebar 固定連結對應已存在全域或站點管理頁，功能連結由七項已實作管理功能 allowlist 產生。

## 尚待確認

- 此環境未執行瀏覽器互動式的桌面及窄螢幕逐連結檢查；導航目標以 route 檔案盤點與型別/ lint 檢查確認。
- 舊文章 `?preview=1` 不再繞過已發布條件；此前路由註解亦指出 preview 尚未實作成會員授權。現有文章列表、已發布文章明細與 API 路徑仍保留。

## 提交

提交訊息：`feat: connect subsite content navigation and compatibility routes`
