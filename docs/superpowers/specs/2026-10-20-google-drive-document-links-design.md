# Google Drive 文件連結設計

## 目標

讓公告欄、公開展覽、會議記錄、協力廠商與選配作業的每筆資料，可以管理多個 Google Drive PDF 連結，並在前台資料可見時提供檢視／下載入口。

## 已確認需求

- 每筆資料預設有一個 Google Drive URL 欄位。
- 後台可按鈕新增更多 URL 欄位，也可移除欄位。
- Google Drive 連結設定為「取得連結者可檢視」；本站不代理檔案、不儲存 PDF。
- PDF 是主要用途，但欄位只驗證 Google Drive 連結，不下載檔案檢查 MIME type。
- 前台顯示檔案清單，使用新分頁開啟 Google Drive 連結；連結名稱以「PDF 檔案 1、PDF 檔案 2」等序號顯示。
- 空白 URL 不儲存；有效 URL 依後台排序保存。
- 既有本站媒體庫附件保留，不轉換、不刪除；Google Drive 連結是獨立附件來源。
- 本次先實作五個指定功能，資料結構使用 `ownerType`／`ownerId` 可供後續功能共用。

## Google Drive URL 規則

- 只接受 `https:`。
- hostname 必須是 `drive.google.com` 或 `www.drive.google.com`，避免把任意外部網址當成文件連結。
- 多筆輸入先 trim；重複 URL 去除並保留第一次出現的順序。
- 非空但格式錯誤的 URL 回傳 400，錯誤訊息為「Google Drive 連結格式無效」。
- URL query（例如 `usp=sharing`）保留原值，前台直接開啟原始連結。

## 資料模型

新增 `ContentExternalLink`，不改造既有 `ContentAttachment`：

- `id`、`siteId`、`ownerType`、`ownerId`、`url`、`sortOrder`、`createdAt`。
- `siteId` cascade delete；`ownerType`／`ownerId` 使用多型關聯，避免為五個功能各建立一張附件表。
- 索引 `(siteId, ownerType, ownerId, sortOrder)`。
- 建立 Prisma migration；既有資料不需轉換。

## 後台行為

共用 `GoogleDriveLinksField` client component 管理 URL 陣列：初始空值顯示一個欄位，按「新增檔案連結」追加欄位，按「移除」刪除欄位；欄位提示為「請確認 Google Drive 設定為『取得連結者可檢視』」。

五個 API 接收 `driveUrls: string[]`，建立或更新時在同一 transaction 內同步該 owner 的 `ContentExternalLink`；更新送出空陣列會清除既有 Google Drive 連結。既有 API 的媒體附件欄位維持相容。

## 前台行為與權限

- 公告詳細頁、公開展覽詳細頁、協力廠商詳細頁、選配作業項目，以及會議記錄項目顯示「相關 PDF」清單。
- 只從已發布的父資料查詢連結；`requirePublicFeature` 先套用功能的公開／會員限定權限，因此不新增繞過權限的下載 API。
- 連結使用 `target="_blank"`、`rel="noopener noreferrer"`，由 Google Drive 決定檢視／下載權限。
- 沒有連結時不顯示空的附件區塊；既有媒體附件顯示保持不變。

## 非目標

- 不在本站下載、轉存、重新命名或代理 Google Drive PDF。
- 不驗證 Google Drive 檔案是否真的存在或是否為 PDF；這由使用者的 Drive 分享設定與檔案內容負責。
- 不在本次加入都更進度、地圖資訊或其他未列出的功能表單。
