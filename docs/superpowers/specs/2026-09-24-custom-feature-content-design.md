# 自訂功能側欄與資料管理設計

日期：2026-09-24

## 1. 目標

讓子網站已啟用的所有功能都出現在專案後台左側功能選單。具有既有管理頁的系統功能沿用原頁面；其餘功能提供通用資料管理，使站點管理員與編輯者能新增多筆資料，並於子網站前台瀏覽。

每筆自訂資料可選擇文字、YouTube 或圖片類型。資料儲存後立即顯示，並沿用該功能的公開／僅限成員設定。

## 2. 現況與設計決策

- `SiteAdminLayout` 已透過 `getEnabledFeatures` 傳入啟用功能；目前 `Sidebar` 再以 `getImplementedAdminFeatures` 過濾，只保留有專屬管理頁的系統功能，因此自訂功能不會出現在側欄。
- 自訂功能目前只有全域名稱、說明與路徑，沒有按站點分類的內容資料或後台 CRUD 頁。
- 前台 catch-all 頁目前只顯示功能名稱與說明。
- 專案已有站點媒體上傳及媒體可見性檢查；尚未支援 YouTube 連結嵌入。
- 採用獨立 `FeatureEntry` 模型，不將媒體欄位加入一般 `Page` 模型。
- 內容類型屬於每筆資料，不屬於功能定義；同一自訂功能可混合文字、YouTube 與圖片資料。
- 資料無草稿狀態；建立或修改後立即依功能可見性呈現。

## 3. 資料模型

新增 `FeatureEntry`：

```text
id          Int
siteId      Int
featureId   Int
title       String
content     String?
contentType String       // text, youtube, image
youtubeUrl  String?
mediaId     Int?
createdAt   DateTime
updatedAt   DateTime
```

- `siteId` 隔離不同子網站資料；`featureId` 指向全域 `FeatureDefinition`。
- `contentType=text` 使用標題與內文；`youtube` 使用標題、可選說明及 YouTube 網址；`image` 使用標題、可選說明及站點媒體 ID。
- `site` 與 `feature` 關聯使用 cascade；刪除功能定義時，刪除所有子網站該功能的資料。
- `mediaId` 關聯至 `Media`；圖片媒體仍受站點隔離與媒體引用保護，不可刪除仍在使用中的圖片。
- 建立 siteId/featureId 索引；詳細頁以 FeatureEntry 數字 ID 作為路徑參數，不另增加 slug 欄位。
- 新 migration 只新增功能資料與關聯，不遷移或修改既有 `Page`、`Post` 內容。

## 4. 後台導覽與資料管理

### 4.1 左側功能選單

- 直接使用站點目前啟用的功能清單，不再只顯示已實作專屬管理頁的項目。
- 系統功能的既有靜態管理路由維持原狀。
- 沒有專屬管理頁的啟用功能進入通用功能資料管理頁。
- 停用功能不顯示於側欄；直接進入停用功能的後台資料路由時回 404。
- 新增自訂功能時，路徑使用單層小寫 slug（小寫英數、底線、連字號）；不得與現存功能的 key/path 重複，也不得與任何既有公開或後台靜態路由衝突，以免被靜態頁面攔截。

### 4.2 通用資料管理

通用管理頁依目前子網站與功能提供：

- 資料清單、建立、編輯及刪除。
- 建立／編輯欄位：標題、內容類型、內文或媒體來源。
- 文字資料呈現標題與內文。
- YouTube 資料呈現標題、可選說明與網址。
- 圖片資料使用現有站點上傳 API，選擇圖片後建立媒體關聯；替代文字沿用 Media metadata。
- 刪除單筆資料前顯示確認。
- 內容查詢與寫入必須同時限定 siteId 與 featureId。

建議頁面路徑：

```text
/{siteSlug}/admin/{featurePath}
/{siteSlug}/admin/{featurePath}/new
/{siteSlug}/admin/{featurePath}/{entryId}/edit
```

通用 dynamic catch-all 只處理未被既有靜態管理頁匹配的路徑；非預期的參數結構回 404。

### 4.3 功能刪除

- 全域刪除確認訊息需明確告知：將刪除功能及所有子網站該功能的資料。
- 後端刪除 FeatureDefinition；FeatureEntry 透過資料庫關聯 cascade 一併刪除。
- 停用功能不刪除內容；重新啟用後仍可管理既有資料。

## 5. 前台與媒體呈現

### 5.1 前台路由

```text
/{siteSlug}/{featurePath}
/{siteSlug}/{featurePath}/{entryId}
```

- 清單頁顯示功能名稱、功能說明及該站該功能的資料。
- 清單版面遵循 SiteFeature 的 list/card/grid 顯示模式；功能導覽順序遵循 SiteFeature.sortOrder，功能內資料依 createdAt 遞減排序。
- 點選資料後顯示標題、內文或媒體內容。
- 只有已啟用功能的資料可由前台直接讀取。
- 若功能 visibility 為 members，訪客導向站點登入，非站點成員拒絕存取。

### 5.2 YouTube

- 接受 `youtube.com`、`www.youtube.com`、`m.youtube.com` 與 `youtu.be` 網域的有效影片網址。
- API 驗證協定、host 與影片 ID；拒絕任意外部 iframe URL。
- 前台轉為固定 YouTube privacy-enhanced embed URL（`youtube-nocookie.com/embed/{videoId}`），避免將使用者輸入直接作為 iframe source。

### 5.3 圖片與媒體可見性

- 圖片使用既有 `POST /api/{siteSlug}/admin/assets` 上傳，FeatureEntry 只存媒體 ID。
- 建立或修改圖片關聯時，API 確認 Media.siteId 與目前站點一致。
- 擴充 `resolveMediaVisibility`，將 FeatureEntry 的圖片引用與 feature visibility 納入檢查。
- 只有已啟用功能能公開圖片；members 功能圖片只允許成員查看。
- 媒體刪除 API 若圖片仍被 FeatureEntry 引用，依既有引用保護規則拒絕刪除。

## 6. 權限、API 與錯誤處理

### 6.1 權限

- 全域管理員、該站站點管理員與編輯者可讀寫功能資料。
- Viewer 可瀏覽後台資料清單，但不可新增、修改或刪除。
- 每個管理頁與 API 以現有 `requireContentPermission` 驗證站點與角色，並另外確認功能存在且已啟用。
- 前台依 `requirePublicFeature` 驗證站點、功能啟用及公開／成員可見性。

### 6.2 API

使用獨立路徑避免與目前站點功能設定 API 衝突：

```text
GET    /api/{siteSlug}/admin/feature-entries/{featurePath}
POST   /api/{siteSlug}/admin/feature-entries/{featurePath}
GET    /api/{siteSlug}/admin/feature-entries/{featurePath}/{entryId}
PATCH  /api/{siteSlug}/admin/feature-entries/{featurePath}/{entryId}
DELETE /api/{siteSlug}/admin/feature-entries/{featurePath}/{entryId}
```

### 6.3 驗證與錯誤

- 缺少標題、內容類型不支援、文字類型缺少內文、YouTube URL 不合法：回 400。
- featurePath 不存在、停用、非此站功能或 entry 不屬於此站／此功能：回 404。
- 未登入存取 members 功能時導向站點登入；已登入但非成員回 403。
- 無編輯權限寫入回 403。
- 跨站 mediaId 回 400 或 404，不建立資料。
- 寫入失敗不暴露資料庫細節。

## 7. 測試與驗收

### 功能

- 側欄顯示所有已啟用功能並遵守排序；停用功能不顯示。
- 系統功能仍進入既有專屬管理頁，自訂功能可進入通用 CRUD 頁。
- 可建立、列表、修改與刪除文字、YouTube 與圖片資料。
- 前台列表與詳情呈現正確，並遵守 list/card/grid 設定。
- YouTube 網址驗證拒絕偽造網域及非法影片 ID。
- 圖片使用現有媒體上傳，前台可見性符合功能 visibility。
- 刪除功能會刪除所有站點該功能資料；停用再啟用保留資料。
- 一般 Page/Post 資料與路由行為維持不變。

### 權限與多租戶

- A 站不可讀寫 B 站 FeatureEntry，即使提供有效 entryId。
- 只能操作所屬 siteId 與 featureId 的資料。
- 停用功能的管理 API 與前台頁面均拒絕存取。
- members 功能之匿名訪客、站點成員、非成員各自符合存取規則。
- viewer 不能寫入；editor/site admin 可寫入。
- 媒體 URL 不會繞過站點或功能可見性檢查。

### 驗證命令

```text
npm test
npm run lint
npm run build
```

資料庫 migration 部署前，依專案部署規範先以 SQLite 線上備份 `data/prod.db` 並確認 quick_check 為 `ok`，再使用 `npx prisma migrate deploy`；不得執行正式資料庫 seed。

## 8. 不在本次範圍

- 不提供使用者自訂任意欄位或表單 schema。
- 不增加草稿／發布狀態；內容儲存後即依功能 visibility 顯示。
- 不允許任意外站 iframe/embed；媒體只支援有效 YouTube 連結與站點圖片。
- 不改寫既有系統功能的專屬資料模型與管理頁。
