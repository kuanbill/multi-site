# 首頁主圖改上傳與可設定資料區塊設計

日期：2026-10-03
狀態：已核准

## 目標

1. 子網站首頁主圖改用圖檔上機制設定，不再要求管理者手動輸入數字媒體 ID。
2. 首頁資料區塊改為可設定：管理者可挑選要顯示的資料來源與筆數，取代目前寫死在首頁的三個區塊。

## 背景與現況

### 主圖

`SiteHome.heroMediaId`（`prisma/schema.prisma`）是單一外鍵指向 `Media.id`。

後台 `src/app/[siteSlug]/admin/home/HomeForm.tsx` 提供「主圖 Media ID」數字輸入框與「主圖 URL」文字框。兩者都不是上傳機制：

- 使用者必須先透過其他功能上傳圖檔，再手動查出其數字 ID。
- API `src/app/api/[siteSlug]/admin/home/route.ts` 的 `resolveHeroMediaId()` 會把 `heroMediaUrl` 拿去與 `Media.url` 完全比對，比對不到就回 400。因此無法設定站外圖片網址，URL 欄位實際上只是「反查既有媒體」的比對值。

專案已有完整的上傳機制：`POST /api/{siteSlug}/admin/assets` → `src/lib/media.ts` 的 `saveMedia()`，限制 10 MB、僅允許 PDF 與 avif/gif/jpeg/png/webp、檔名採 `randomUUID()`、回傳站內相對路徑 `/uploads/<filename>`。

`src/components/admin/MediaPicker.tsx` 是既有的通用媒體選擇器（含上傳區與媒體網格），但從未被任何頁面引用，且帶有三個缺陷（見「Task 2」）。

### 首頁區塊

`src/app/(public)/[siteSlug]/page.tsx` 目前在首頁硬編碼三個資料區塊：

| 區塊 | 資料來源 | 篩選 | 排序 | 筆數 | 空白處理 |
| --- | --- | --- | --- | --- | --- |
| 目前進度 | `ProgressItem` | `status='published'` 且 `progressStatus='current'` | `stageDate desc` | `findFirst` = 1 筆 | 不渲染區塊 |
| 頁面 | `Page` | 無（`Page` 沒有發布狀態欄位） | `createdAt asc` | 無上限 | 不渲染區塊 |
| 最新公告 | `Announcement` | `status='published'` | `pinned` desc, `publishedAt` desc, `createdAt` desc | `take: 3` | 顯示「尚無公告」 |

三者的可見性都要求對應功能 `enabled` 且 `visibility === 'public'`，所以成員限定（`members`）的公告／進度在首頁完全看不到。

## 已確認決策

| 項目 | 決策 |
| --- | --- |
| 主圖輸入方式 | 媒體選擇器（上傳新檔或選站台既有圖檔），可清除 |
| 區塊數量 | 多個，每站上限 6 個 |
| 區塊來源 | 4 種：`feature`／`announcement`／`progress`／`page` |
| 區塊內容 | 縮圖＋標題＋摘要＋badge |
| 可選功能項範圍 | 全部已啟用功能項，含成員限定；未登入時顯示登入提示 |
| 進度語意 | 可選「僅進行中」或「全部已發布」 |
| 每站筆數 | 1–12 筆 |
| 既有三區塊 | 移除，後台提供「一鍵加入預設區塊」按鈕恢復 |
| 空白處理 | 統一顯示區塊標題與「尚無資料」 |

## Task 1：資料模型

新增 `SiteHomeSection`，並在 `Site` 與 `FeatureDefinition` 補上反向關聯欄位（Prisma 要求雙向）。

```prisma
model SiteHomeSection {
  id         Int      @id @default(autoincrement())
  siteId     Int
  sourceType String
  featureId  Int?
  filter     String   @default("all")
  title      String?
  limit      Int      @default(3)
  showAll    Boolean  @default(true)
  sortOrder  Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  site    Site              @relation(fields: [siteId], references: [id], onDelete: Cascade)
  feature FeatureDefinition? @relation(fields: [featureId], references: [id], onDelete: Cascade)

  @@index([siteId, sortOrder])
}
```

- `sourceType`：`feature`｜`announcement`｜`progress`｜`page`
- `featureId`：僅 `sourceType='feature'` 時使用
- `filter`：僅 `progress` 使用，`current`｜`all`；其他來源一律 `all`
- `title`：自訂標題，留空則使用來源預設標題
- `SiteHome` 本身不變更，既有資料不受影響。

遷移檔名：`prisma/migrations/20261003000000_add_site_home_sections/migration.sql`

## Task 2：修正 MediaPicker

`MediaPicker` 在被主圖採用前必須先修好三個既有缺陷：

1. 把 async `loadMedia()` 放進 `useState` lazy initializer，導致 render 期間發出請求、React StrictMode 重複請求、失敗被靜默吞掉 → 改用 `useEffect`。
2. 按鈕文字是未翻譯的韓文 → 改為繁體中文。
3. `uploading` state 宣告後從未使用 → 移除。

順帶整理選取預覽圖時重複的陣列查找。

## Task 3：主圖改用上傳

- `HomeForm` 以單選、`accept='image'` 模式嵌入 `MediaPicker`，並提供「清除主圖」。
- `resolveHeroMediaId()` 移除 `heroMediaUrl` 比對分支，保留 `id + siteId` 的跨站防護。
- `src/lib/contentValidation.ts` 的 `SiteHomeInput` 移除 `heroMediaUrl` 欄位。
- GET 仍回傳 `heroMediaUrl` 供後台預覽。
- 不需要資料庫遷移。

## Task 4：區塊領域邏輯（`src/lib/homeSections.ts`）

- `HOME_SECTION_SOURCES`：合法的 `sourceType` 清單。
- `resolveSectionVisibility(visibility, isMember)`：回傳 `'show'`、`'login-prompt'` 或 `'hide'`，為純函式以利測試。
- 四個查詢函式，各自封裝 `where`／`orderBy`／`take`，對應回傳統一的 `HomeSectionItem` 形狀（`id`、`title`、`excerpt`、`href`、`imageUrl`、`badge`、`meta`）。

各來源的查詢條件沿用現有前台頁面的寫法：

| 來源 | where | orderBy | 縮圖 |
| --- | --- | --- | --- |
| `feature` | `siteId`、`featureId` | `createdAt desc` | 有（`media.url`） |
| `announcement` | `siteId`、`status='published'` | `pinned` desc, `publishedAt` desc, `createdAt` desc | 無 |
| `progress`（`current`） | `siteId`、`status='published'`、`progressStatus='current'` | `stageDate desc` | 無 |
| `progress`（`all`） | `siteId`、`status='published'` | `sortOrder` asc, `stageDate` asc, `createdAt` asc | 無 |
| `page` | `siteId` | `createdAt asc` | 無 |

縮圖僅 `FeatureEntry` 有媒體欄位；`Announcement` 雖可透過 `ContentAttachment` 掛圖，但需要額外查詢，本階段不做。

- `validateHomeSectionInput()`：`sourceType` 必須合法；`feature` 型必須指定屬於本站且已啟用的功能，其他來源不得帶 `featureId`；`limit` 為 1–12 的整數；`filter` 僅 `progress` 可設 `current` 或 `all`。

## Task 5：API

| 端點 | 方法 | 權限 |
| --- | --- | --- |
| `/api/[siteSlug]/admin/home-sections` | GET／POST | `read`／`write` |
| `/api/[siteSlug]/admin/home-sections/[id]` | PATCH／DELETE | `write` |
| `/api/[siteSlug]/admin/home-sections/defaults` | POST | `write` |

規則：

- 一律以 `requireContentPermission(siteSlug, action)` 做權限檢查，因此站內編輯者與管理員都可維護區塊。
- 跨站檢查一律帶 `where: { id, siteId }`，查無即回 404。
- POST 新增時檢查區塊數不得超過 6。
- `defaults` 建立「最新公告」「目前進度」「頁面」三個區塊，重複呼叫不會重複建立。

## Task 6：前台

- `src/app/(public)/[siteSlug]/page.tsx` 移除三個區塊與其查詢，保留主圖卡片與聯絡資訊，改由 `HomeSections` 組裝。
- 新增 `src/components/public/HomeSections.tsx`（server component）與 `HomeSectionCard.tsx`。
- 需要 `getServerSession` 與 `isSiteMember` 判斷成員限定區塊；**不可見時不查詢該區塊資料**，只渲染登入提示連到 `/{siteSlug}/login?reason=members-only`。
- 「查看全部」連結對應到各來源的列表頁；可用 `showAll` 關閉。
- 功能被停用則整個區塊不顯示。

## Task 7：後台

- 首頁設定頁傳入區塊列表與可選來源。
- 新增 `HomeSectionsManager`（新增／編輯／刪除／上移下移）與表單元件。
- 成員限定的來源選項標註「僅成員可見」。
- 提供「一鍵加入預設區塊」按鈕。

## 測試策略

領域邏輯與 API 以 vitest 先寫失敗測試再實作。可見性判定與輸入驗證為純函式，可完整單測。前台渲染與後台表單需要元件測試基礎設施，本專案尚未導入，因此這兩部分以 `tsc`、`lint`、`build` 驗證。

## 影響與後果

1. 既有站台首頁在部署後會失去原本的三個區塊，需在後台點「一鍵加入預設區塊」才會恢復。這是為了讓區塊設定一致可控而刻意接受的取捨。
2. 只有 `feature` 型來源顯示縮圖。
3. 本次變更包含一個資料庫遷移，部署前須備份 `data/prod.db` 並確認 `quick_check` 為 `ok`。