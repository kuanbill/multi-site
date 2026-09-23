# Task 6 — Selection, Maps, and File Uploads 報告

## 變更

- 新增選屋後台 API：`GET/PATCH`，以 `siteId` upsert；只更新標題、說明、階段、規則、注意事項、截止日期、外部連結、狀態與發布時間，不接收居民/戶別/選配結果/付款欄位。截止日期與 `http(s)` URL 均有驗證。
- 新增地圖 API：集合 `GET/POST`、單筆 `PATCH/DELETE`；強制標題、圖片或下載媒體至少提供一項，檢查媒體同站點、狀態與排序，刪除時清除對應 `ContentAttachment`。
- 新增媒體上傳與刪除 API。上傳使用既有 `saveMedia` helper，Node.js runtime、multipart `file`/`altText`/`label`，支援 MIME allowlist 並限制 10 MiB；資料庫寫入失敗由 helper 刪除已寫入檔案。媒體刪除限站點管理員/全域管理員，拒絕仍被附件、首頁主圖、廠商 Logo 或地圖欄位引用的媒體。
- 新增 `/uploads/[filename]` 讀取 handler，從 `UPLOAD_DIR`（未設定時為 `data/uploads`）讀取登記於資料庫的媒體，讓上傳回傳 URL 在伺服器重啟後仍可服務。
- 新增地圖下載 handler，使用 `requirePublicFeature` 驗證站點地圖功能與 members 可見性，再提供已發布地圖的附件下載。
- 新增選屋與地圖管理頁、選屋表單/地圖表單，以及公開資訊頁；公開查詢均先通過 feature/members guard，並只載入已發布內容。
- `validateAsset` 現在拒絕超過 10 MiB 的檔案，並新增超大檔案驗證測試。

## 驗證

- `npx tsc --noEmit` — 通過，無輸出。
- `npm run lint` — 通過，0 errors；仍有 6 個既存 unused-variable warnings，位於 `src/app/api/[siteSlug]/admin/users/invite/route.ts`、`src/app/api/sites/[id]/pages/route.ts`、`src/app/api/sites/[id]/posts/route.ts`、`src/app/api/sites/[id]/route.ts`（2 處）、`src/app/api/sites/route.ts`。
- `npm test -- src/lib/contentValidation.test.ts src/lib/media.test.ts` — 通過，2 個測試檔、15 個測試。
- `npm test` — 通過，8 個測試檔、26 個測試。
- `git diff --check` — 通過；僅顯示 Git 將 LF 轉成 CRLF 的工作目錄警告。
- 曾先執行新增大小限制測試確認 RED（`validateAsset` 原先接受 10 MiB 以上檔案），加上檢查後 focused tests 通過。
- Next.js 路由/API 文件已閱讀：`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`、`03-layouts-and-pages.md`。

## 尚未完成的手動驗證 / 注意事項

- 未執行實際上傳圖片/PDF、執行檔/超大檔拒絕，以及重啟服務後實檔持續讀取的端對端驗證；本 worktree 未啟動具資料庫的開發伺服器。
- Docker 無法執行（`docker --version` 回報找不到命令），因此未進行 Docker data volume 驗證。
- 上傳 URL `/uploads/<filename>` 是媒體 URL；地圖檔案下載連結額外經過站點/發布狀態守衛。媒體直接 URL 的圖片預覽仍可由持有 URL 的人直接讀取，頁面層 members guard 不會隱藏這個已知媒體 URL。
- 對錯誤 MIME 標示的實際內容未進行檔案特徵（magic-byte）檢測；現有 shared helper 的 MIME allowlist 以瀏覽器提交的 MIME 為準。
