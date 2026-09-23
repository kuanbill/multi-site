# 子網站專案後台內容管理設計

日期：2026-09-23

## 1. 目標

將每個都更專案的子網站，從目前的通用頁面/文章管理，擴充為可由專案後台維護、並在前台呈現的專用內容功能。

每個站點預設提供以下功能：

1. 首頁
2. 公告欄
3. 都更進度
4. 公開展覽
5. 會議記錄
6. 協力廠商
7. 正式選配
8. 相關圖資

首頁是站點入口，不視為可關閉的普通功能。其餘七項功能由站點功能設定控制是否啟用，以及前台是公開或僅站點成員可查看。

## 2. 參考內容結構

本設計以以下網站的導覽與內容型態為基準：

`https://www.landagent.com.tw/hl02/pages/home.html`

參考網站包含專案簡介、公告日期與內文、都更進度時間軸、公開展覽圖片、依類型分組的會議記錄 PDF、協力廠商服務與契約文件、正式選配說明，以及相關圖資圖片。

本系統第一階段將「正式選配」定義為資訊管理功能：管理選配說明、規則、注意事項、文件與外部系統連結。不在本系統保存住戶個人選配結果，也不實作住戶線上選配交易流程。

## 3. 現有系統整合

現有系統使用 Next.js App Router、Prisma SQLite、NextAuth 與站點路徑多租戶架構：

- 站點由 `siteSlug` 識別。
- `FeatureDefinition` 定義全域功能目錄。
- `SiteFeature` 定義站點是否啟用功能與排序。
- `SiteUser` 定義站點成員與角色。
- 目前已有 `Page`、`Post`、`Media` 資料表與舊的站點內容 API。

本設計不立即刪除 `Page` / `Post`。既有資料先保留，實作時可提供資料搬遷或相容讀取，完成切換並確認資料後再評估移除舊路由。

## 4. 功能開關與前台存取

### 4.1 `SiteFeature` 設定

沿用現有 `FeatureDefinition` + `SiteFeature`，並在 `SiteFeature` 增加：

```text
visibility: public | members
```

現有欄位仍保留：

- `enabled`：功能是否啟用。
- `sortOrder`：後台與前台導覽排序。
- `displayMode`：list、card 或 grid，依功能支援情況使用。

規則如下：

- `enabled=false`：不顯示前台導覽，直接存取前台路徑回 404；具備後台內容權限者仍可維護該功能資料。
- `enabled=true, visibility=public`：訪客可查看已發布內容。
- `enabled=true, visibility=members`：未登入訪客導向該站登入頁；已登入但不屬於該站者拒絕存取。
- 功能設定頁只有站點管理員與全域管理員可修改。
- 功能可見性與前台啟用狀態不影響後台管理權限；具備站點內容管理權限者仍可管理已啟用或暫停中的內容。

### 4.2 預設功能

| 功能 | `key` | `path` | 預設狀態 | 預設前台可見性 |
| --- | --- | --- | --- | --- |
| 首頁 | `home` | 空字串 | 固定啟用 | `public` |
| 公告欄 | `announcements` | `announcement` | 啟用 | `public` |
| 都更進度 | `progress` | `progress` | 啟用 | `public` |
| 公開展覽 | `exhibitions` | `exhibition` | 啟用 | `public` |
| 會議記錄 | `meetings` | `meeting` | 啟用 | `members` |
| 協力廠商 | `vendors` | `vendors` | 啟用 | `members` |
| 正式選配 | `selection` | `selection` | 啟用 | `members` |
| 相關圖資 | `maps` | `maps` | 啟用 | `members` |

`home` 不需要一般 `SiteFeature` 導覽項目，但可以使用固定的首頁設定與首頁內容權限。

## 5. 角色與權限

### 5.1 角色

- 全域 `admin`：可管理所有站點、全域功能定義、站點功能設定與站點內容。
- 站點 `admin`：可管理該站全部內容、成員與功能設定。
- 站點 `editor`：可新增、修改、發布與封存該站內容；不可管理成員與功能可見性。
- 站點 `viewer`：可登入後台查看該站內容；不可新增、修改、發布或刪除。

### 5.2 權限檢查順序

所有站點後台頁面與 API 使用相同順序：

1. 解析 `siteSlug`。
2. 確認站點存在且未封存。
3. 確認使用者已登入。
4. 確認使用者是全域管理員或該站成員。
5. 依操作檢查站點角色。
6. 對內容功能確認功能定義存在；`enabled` 僅限制前台存取，不限制具備權限者維護後台內容。
7. 確認目標資料的 `siteId` 等於 URL 解析出的站點 ID。

前台另依 `SiteFeature.visibility` 檢查訪客或站點成員資格，再只回傳 `published` 內容。

## 6. 資料模型

### 6.1 共通內容欄位

除一對一的首頁與選配說明外，內容模型使用以下共通欄位：

```text
id          Int
siteId      Int
status      String       // draft, published, archived
sortOrder   Int
createdAt   DateTime
updatedAt   DateTime
publishedAt DateTime?
```

所有內容模型以 `siteId` 建立查詢索引；需要 slug 的詳細頁模型使用 `@@unique([siteId, slug])`。

### 6.2 首頁 `SiteHome`

一個站點一筆，與 `Site` 一對一：

```text
id
siteId              unique
tagline             String?
intro               String?
heroMediaId         Int?
currentStage        String?
contactName         String?
contactPhone        String?
contactEmail        String?
contactAddress      String?
updatedAt
```

首頁的最新公告與目前進度摘要由已發布資料自動產生，不另外複製保存。

### 6.3 公告 `Announcement`

```text
id
siteId
title               String
slug                String
summary             String?
content             String?
category            String?
pinned              Boolean
status              String
publishedAt         DateTime?
sortOrder           Int
createdAt
updatedAt
```

### 6.4 都更進度 `ProgressItem`

```text
id
siteId
stageDate           DateTime
stageLabel          String
title               String
summary             String?
content             String?
progressStatus      String       // completed, current, upcoming
status              String       // draft, published, archived
sortOrder           Int
publishedAt         DateTime?
createdAt
updatedAt
```

同一站點最多一筆 `progressStatus=current` 的已發布項目；若後台將新階段設為目前進度，前一筆自動改為 `completed`。

### 6.5 公開展覽 `Exhibition`

展覽主資料：

```text
id
siteId
title               String
slug                String
startDate           DateTime?
endDate             DateTime?
location            String?
description         String?
feedbackSummary     String?
status              String
sortOrder           Int
publishedAt         DateTime?
createdAt
updatedAt
```

展覽圖片與文件透過附件關聯到 `Media`，可支援一個展覽多個圖檔及 PDF。

### 6.6 會議記錄 `MeetingRecord`

```text
id
siteId
meetingType         String       // board, general, other
meetingNo           String?
title               String
meetingDate         DateTime
summary             String?
status              String
sortOrder           Int
publishedAt         DateTime?
createdAt
updatedAt
```

議事錄 PDF 與其他附件透過 `ContentAttachment` 關聯。前台依 `meetingType` 分組，組內依日期遞減排序。

### 6.7 協力廠商 `Vendor`

```text
id
siteId
name                String
category            String
summary             String?
description         String?
services            String?
contactName         String?
contactPhone        String?
contactEmail        String?
logoMediaId         Int?
status              String
sortOrder           Int
publishedAt         DateTime?
createdAt
updatedAt
```

聯絡資訊可在後台填寫，但前台是否顯示由欄位內容及站點需求控制；契約書透過附件管理。

### 6.8 正式選配 `SelectionInfo` 與文件

每個站點一筆：

```text
id
siteId              unique
title               String
description         String?
applicableStage     String?
rules               String?
notice              String?
deadline            DateTime?
externalUrl         String?
status              String
publishedAt         DateTime?
updatedAt
```

附件可包含選配說明書或其他正式文件。第一階段不建立住戶、戶別、選配項目或個人提交資料表。

### 6.9 相關圖資 `MapAsset`

```text
id
siteId
title               String
category            String?
description         String?
imageMediaId        Int?
downloadMediaId     Int?
status              String
sortOrder           Int
publishedAt         DateTime?
createdAt
updatedAt
```

### 6.10 媒體與附件

沿用 `Media` 並補充：

```text
filename
url
type
mimeType            String?
sizeBytes           Int?
altText             String?
createdAt
```

新增 `ContentAttachment`：

```text
id
siteId
mediaId
ownerType           String       // announcement, exhibition, meeting, vendor, selection, map
ownerId             Int
label               String?
sortOrder           Int
createdAt
```

`ownerType` / `ownerId` 的完整性由 API 層驗證：建立關聯前確認擁有者屬於相同 `siteId`；刪除內容時一併刪除附件關聯，不直接刪除仍被其他內容使用的媒體。

## 7. 後台頁面與操作

### 7.1 首頁設定

路由：

```text
/{siteSlug}/admin/home
```

操作：

- 編輯標語、簡介、目前階段與聯絡資訊。
- 上傳、替換或移除首頁主圖。
- 儲存後立即反映在前台首頁。
- 最新公告與進度摘要不在此重複輸入，從內容資料自動取得。

### 7.2 一般內容功能

公告、進度、展覽、會議、廠商、圖資的列表頁統一提供：

- 關鍵字搜尋。
- 狀態篩選：草稿、已發布、封存。
- 分類或日期篩選。
- 新增、編輯、預覽、發布、封存、刪除。
- 可排序內容提供拖曳或順序欄位。

表單提供：

- 必填欄位提示。
- API 與瀏覽器雙重驗證。
- 附件上傳、替換、刪除與檔案資訊顯示。
- 儲存草稿與直接發布兩種操作。
- 已發布資料編輯後維持原發布狀態，除非使用者明確改為草稿或封存。

### 7.3 功能設定

路由：

```text
/{siteSlug}/admin/settings/features
```

操作：

- 啟用/停用功能。
- 設定前台可見性：公開或僅成員。
- 調整前台導覽排序。
- 調整列表顯示模式：list、card、grid（功能支援時才顯示）。
- 儲存後重新驗證站點前台與後台相關路徑。

### 7.4 正式選配

第一階段只提供單頁內容編輯：

- 選配說明。
- 適用階段。
- 選配規則。
- 注意事項。
- 截止日期。
- 外部系統連結。
- 說明文件。

不提供個人選配結果輸入，以避免在未定義住戶身份、戶別驗證與資料保存規則前產生錯誤的業務流程。

## 8. 前台頁面

### 8.1 首頁

```text
/{siteSlug}/
```

呈現：

- 專案名稱與標語。
- 主圖與專案簡介。
- 目前都更階段。
- 最新三筆已發布公告。
- 功能導覽或快速入口。
- 聯絡資訊（有填寫才顯示）。

### 8.2 公告欄

```text
/{siteSlug}/announcement
/{siteSlug}/announcement/{slug}
```

列表以置頂優先、發布日期遞減排序；詳細頁顯示標題、分類、日期、全文與附件。

### 8.3 都更進度

```text
/{siteSlug}/progress
```

以時間軸呈現階段日期、階段名稱、標題、說明與完成/進行中/待辦狀態；目前階段視覺上明確標示。

### 8.4 公開展覽

```text
/{siteSlug}/exhibition
/{siteSlug}/exhibition/{slug}
```

呈現展覽日期、地點、說明、圖片牆、附件與意見回饋摘要。

### 8.5 會議記錄

```text
/{siteSlug}/meeting
```

依會議類型分組，顯示日期、會議名稱、摘要與議事錄檔案連結。

### 8.6 協力廠商

```text
/{siteSlug}/vendors
/{siteSlug}/vendors/{id}
```

以卡片顯示廠商名稱、服務類別與摘要；詳細頁顯示服務項目、介紹與契約文件。

### 8.7 正式選配

```text
/{siteSlug}/selection
```

呈現選配說明、適用階段、規則、注意事項、截止日期、正式文件與外部系統連結。

### 8.8 相關圖資

```text
/{siteSlug}/maps
```

依分類顯示圖資卡片；支援圖片放大、替代文字與原始檔下載。

## 9. API 契約

每個站點內容功能提供以下 API：

```text
GET    /api/{siteSlug}/admin/{feature}
POST   /api/{siteSlug}/admin/{feature}
GET    /api/{siteSlug}/admin/{feature}/{id}
PATCH  /api/{siteSlug}/admin/{feature}/{id}
DELETE /api/{siteSlug}/admin/{feature}/{id}
```

其他 API：

```text
GET/PATCH /api/{siteSlug}/admin/home
GET/PATCH /api/{siteSlug}/admin/settings/features
POST      /api/{siteSlug}/admin/assets
DELETE    /api/{siteSlug}/admin/assets/{id}
```

API 規則：

- 列表 API 僅回傳目前站點資料。
- 後台列表可回傳草稿、已發布與封存；前台 API/Server Component 只查已發布。
- 後台內容 API 不因功能暫停而阻擋具備站點內容權限的使用者；功能是否啟用只影響前台路由與前台導覽。
- 建立與修改時拒絕無效狀態、無效日期、重複 slug 與跨站附件。
- 發布時設定 `publishedAt`；封存時保留資料但不顯示於前台。
- 刪除前確認使用者具備站點管理權限，並清除附件關聯。
- 成功寫入後使用 `revalidatePath` 或等效機制更新前台快取。

## 10. 檔案處理

第一階段檔案包含圖片與 PDF。檔案處理需：

- 限制允許的 MIME 類型與副檔名。
- 限制單檔大小。
- 產生不可與原始檔名衝突的儲存檔名。
- DB 只保存媒體 metadata 與可供前台使用的 URL。
- 生產環境將上傳目錄放在 Docker 持久化資料卷，不放在短生命週期的容器檔案系統。
- 前台圖片必須有 `altText`；缺少時使用內容標題作為後備文字。
- PDF 下載連結必須經過站點與內容權限檢查，不能只依猜測出的檔案 URL 放行。

## 11. 資料流

### 11.1 後台寫入

```text
後台表單
  -> 站點 API
  -> siteSlug / session / site role 檢查
  -> feature definition / content permission 檢查
  -> 請求欄位與附件驗證
  -> siteId 範圍內寫入 Prisma
  -> 更新發布時間與附件關聯
  -> 重新驗證前台路徑
```

### 11.2 前台讀取

```text
前台路由
  -> 解析 siteSlug
  -> 查 Site 與 SiteFeature
  -> enabled 檢查
  -> visibility / session / membership 檢查
  -> 查 status=published 的站點資料
  -> 依排序與 displayMode 渲染
```

## 12. 錯誤處理

- 不存在的站點、停用功能與不存在的內容：回 404。
- 未登入存取 `members` 功能：導向 `/{siteSlug}/login`。
- 已登入但不是該站成員：回 403，不洩漏內容存在與否以外的資料。
- 後台表單驗證失敗：回 400，保留欄位錯誤訊息。
- slug 重複：回 409，提示使用者修改。
- 附件類型或大小不合規：回 400，不建立孤兒資料。
- 寫入失敗：回 500 並記錄伺服器錯誤，不向前台暴露資料庫細節。

## 13. 驗收條件

### 功能

- 新建站點後自動具備 8 項預設功能與預設排序。
- 後台可分別新增、修改、發布、封存每項內容。
- 首頁自動顯示目前進度與最新公告，不需重複輸入。
- 公告支援詳細頁、置頂與附件。
- 進度支援時間軸與目前階段。
- 展覽支援圖片與文件。
- 會議記錄支援類型分組與 PDF。
- 協力廠商支援服務內容與契約文件。
- 正式選配支援說明、注意事項、文件與外部連結。
- 相關圖資支援圖片牆、分類與下載。

### 權限

- 後台跨站 URL 不能讀取或修改其他站點資料。
- `editor` 不能修改成員與功能可見性。
- `viewer` 不能寫入任何內容。
- `members` 功能未登入時導向該站登入頁。
- 非成員登入後不能查看其他站點的限制內容。
- 草稿、封存資料不會出現在前台。

### 資料與檔案

- 重複 slug 被拒絕。
- 跨站附件關聯被拒絕。
- 刪除內容不留下無主附件關聯。
- 圖片與 PDF 在本機及 Docker 持久化環境均可讀取。

### 驗證命令

```bash
npx tsc --noEmit
npm run lint
npm run build
```

另需以兩個站點、全域管理員、站點 editor、站點 viewer 與未登入訪客驗證完整權限矩陣。

## 14. 分階段範圍

### 第一階段：內容基礎

- 資料表與遷移。
- 8 項預設功能與站點可見性設定。
- 首頁、公告、都更進度、會議記錄。
- 基本圖片/PDF 媒體與附件。

### 第二階段：視覺與文件內容

- 公開展覽。
- 協力廠商。
- 相關圖資。
- 完整圖庫、契約與文件下載。

### 第三階段：正式選配資訊

- 選配說明、規則、注意事項、期限。
- 文件與外部系統連結。
- 不包含住戶線上選配提交。

### 明確排除

- 不在本計畫內建立住戶線上選配交易流程。
- 不在本計畫內建立多資料庫或子網域架構。
- 不以通用 JSON 取代已確認的專用內容模型。
- 不刪除既有 `Page` / `Post` 資料，直到相容與搬遷驗證完成。
