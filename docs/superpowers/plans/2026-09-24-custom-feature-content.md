# 自訂功能資料管理實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 `superpowers:executing-plans` 逐項執行本計畫。步驟使用 checkbox 格式追蹤。

**Goal:** 所有啟用功能都能由專案左側選單進入；自訂功能可管理多筆文字、YouTube 或圖片資料，並依功能權限於前台呈現。

**Architecture:** 新增 site/feature scoped 的 `FeatureEntry` Prisma model。通用功能管理以未被既有靜態路由匹配的後台 catch-all 提供 CRUD；前台沿用既有 public catch-all 顯示清單與單筆內容。側欄直接呈現啟用功能；圖片沿用站點媒體服務，媒體可見性查詢新增 FeatureEntry 引用。

**Tech Stack:** Next.js 16 App Router、React 19、Prisma 7、SQLite、Vitest、NextAuth、既有 Media 上傳與權限工具。

**Spec:** `docs/superpowers/specs/2026-09-24-custom-feature-content-design.md`

## Global Constraints

- 每筆功能資料的 `contentType` 為 `text`、`youtube` 或 `image`；內容儲存後立即依功能 visibility 呈現。
- 自訂功能路徑為單層小寫 slug，只允許小寫英數、底線、連字號，且不可與功能 key/path 或現有公開／後台靜態路由衝突。
- 功能停用時不顯示在側欄，該功能的通用管理 API 與前台路徑皆拒絕存取；停用不刪除資料。
- 資料必須同時依 `siteId` 與 `featureId` 查詢／寫入；不可跨子網站讀寫或關聯媒體。
- 全域管理員與站點管理員／編輯者可建立、修改、刪除 FeatureEntry；Viewer 可讀取清單但不可寫入。
- `members` 功能只允許本站成員查看前台內容與媒體；停用功能不可透過直接網址存取。
- YouTube 只接受有效 YouTube／youtu.be 網址；不得將使用者輸入直接當作任意 iframe URL。
- 圖片沿用現有站點媒體上傳；不可刪除仍被 FeatureEntry 使用的媒體。
- 刪除功能定義會 cascade 刪除所有子網站該功能的 FeatureEntry，操作確認須說明影響。
- 不修改或搬遷既有 `Page`／`Post` 資料；不增加草稿／發布流程或任意使用者自訂欄位 schema。
- 正式環境 migration 前必須線上備份 `data/prod.db` 並確認 `quick_check` 為 `ok`；正式 migration 只使用 `npx prisma migrate deploy`，不可執行 seed。

---

### Task 1: 內容與功能路徑驗證

**Files:**
- Create: `src/lib/featureEntryValidation.ts`
- Test: `src/lib/featureEntryValidation.test.ts`
- Use: `src/lib/contentValidation.ts` 的 `validateRequiredText`；不修改共用驗證檔案。
- Test: `src/app/api/admin/features/route.test.ts`
- Modify/Test: `src/app/api/admin/features/[id]/route.ts` and `route.test.ts`

**Interfaces:**
- Produces `FeatureEntryType = 'text' | 'youtube' | 'image'`。
- Produces `parseFeatureEntryType(value): FeatureEntryType`。
- Produces `validateFeatureEntryInput(value): FeatureEntryInput`，`FeatureEntryInput` 欄位為 `{ title: string; contentType: FeatureEntryType; content: string | null; youtubeUrl: string | null; mediaId: number | null }`。
- Produces `parseYouTubeVideoId(value): string`，錯誤時拋出繁體中文驗證訊息。
- Produces `validateCustomFeaturePath(path): string` 與 `isReservedFeaturePath(path): boolean`；path validator 同時檢查 `/^[a-z0-9_-]+$/` 與保留 route set。
- Produces `buildYouTubeEmbedUrl(videoId): string`，只接收已驗證 video ID。

- [x] **Step 1: 先寫驗證測試**

在 `src/lib/featureEntryValidation.test.ts` 加入以下四項測試：

```ts
it('接受文字、YouTube、圖片三種內容型態', () => {
  expect(parseFeatureEntryType('text')).toBe('text')
  expect(parseFeatureEntryType('youtube')).toBe('youtube')
  expect(parseFeatureEntryType('image')).toBe('image')
  expect(() => parseFeatureEntryType('iframe')).toThrow('內容類型無效')
})

it('解析允許網域的 YouTube video id，拒絕偽造網域', () => {
  expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  expect(buildYouTubeEmbedUrl(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ'))).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  expect(() => parseYouTubeVideoId('https://youtube.com.evil.example/watch?v=x')).toThrow('YouTube 網址無效')
  expect(() => parseYouTubeVideoId('javascript:alert(1)')).toThrow('YouTube 網址無效')
})

it('只接受單層小寫路徑且排除靜態 route collision', () => {
  expect(validateCustomFeaturePath('faq-center')).toBe('faq-center')
  expect(() => validateCustomFeaturePath('info/faq')).toThrow()
  expect(() => validateCustomFeaturePath('announcement')).toThrow('路徑與系統路由衝突')
})

it('依內容類型驗證必要欄位並清除空白', () => {
  expect(validateFeatureEntryInput({ title: '  簡介 ', contentType: 'text', content: '  內容  ' })).toMatchObject({
    title: '簡介', contentType: 'text', content: '內容', youtubeUrl: null, mediaId: null,
  })
  expect(() => validateFeatureEntryInput({ title: '影片', contentType: 'youtube', youtubeUrl: '' })).toThrow('YouTube 網址無效')
  expect(() => validateFeatureEntryInput({ title: '圖片', contentType: 'image', mediaId: '0' })).toThrow()
})
```

- [x] **Step 2: 執行測試確認失敗**

Run: `npm test -- src/lib/featureEntryValidation.test.ts`
Expected: FAIL，因 FeatureEntry 驗證函式尚未存在。

- [x] **Step 3: 實作驗證 helper**

設定允許的 host 清單 `youtube.com`、`www.youtube.com`、`m.youtube.com`、`youtu.be`，使用 `new URL()` 判斷 exact hostname、http/https 協定與 11 字元 `[A-Za-z0-9_-]` video ID；支援 `watch?v=`、`youtu.be/{id}`、`/embed/{id}`、`/shorts/{id}`。Embed URL 一律在呈現層由 video ID 組成 `https://www.youtube-nocookie.com/embed/{videoId}`。

`isReservedFeaturePath` 明確涵蓋功能靜態路由及後台保留路徑：`announcement`、`progress`、`exhibition`、`meeting`、`vendors`、`selection`、`maps`、`pages`、`posts`、`login`、`home`、`users`、`settings`、`admin`。功能目錄中刪除的系統路徑仍需保留在此集合，避免自訂路徑重新撞到靜態 route。

- [x] **Step 4: 執行單元測試確認通過**

Run: `npm test -- src/lib/featureEntryValidation.test.ts`
Expected: 全部通過，YouTube 偽造網域、非法類型、巢狀路徑與靜態路徑均被拒絕。

- [x] **Step 5: 擴充新增功能 API 測試**

在 `src/app/api/admin/features/route.test.ts` 測試自訂路徑命中保留路徑時 POST 回 409，且 Prisma create 不執行；在 `[id]/route.test.ts` 測試自訂功能路徑更新後 key 同步更新、重複／保留路徑回 409、舊 `pages`／`posts` key 不可修改其保留 path。

- [x] **Step 6: 執行 API 測試**

Run: `npm test -- src/app/api/admin/features/route.test.ts`
Expected: 新增及編輯的重複 path 回 409 並回「此路徑已存在，請使用其他路徑」；reserved path 回 409 並回「此路徑為系統保留，請更換其他路徑」；有效單層路徑回 201。

### Task 2: FeatureEntry Prisma model 與 migration

**Files:**
- Modify: `prisma/schema.prisma` (`Site`、`FeatureDefinition`、`Media` relations 與新增 `FeatureEntry` model)
- Generate: Prisma migration folder under `prisma/migrations/` ending in `_add_feature_entries`
- Test: `src/lib/featureEntryMigration.test.ts`

**Interfaces:**
- `FeatureEntry` 欄位：`id`、`siteId`、`featureId`、`title`、`content?`、`contentType`、`youtubeUrl?`、`mediaId?`、`createdAt`、`updatedAt`。
- `feature`、`site` 刪除時 cascade；`media` 參照採 Restrict，圖片仍在使用時不得刪除。
- 索引 `@@index([siteId, featureId])`。

- [x] **Step 1: 先寫 SQLite migration regression test**

使用 `better-sqlite3` 在 `:memory:` DB 依序執行 `prisma/migrations/*/migration.sql`，測試 `sqlite_master` 中存在 `FeatureEntry`，並斷言欄位包含 `siteId`、`featureId`、`title`、`content`、`contentType`、`youtubeUrl`、`mediaId`、`createdAt`、`updatedAt`。再插入一筆 Site、FeatureDefinition、FeatureEntry，刪除 FeatureDefinition 並斷言 FeatureEntry cascade；插入被引用的 Media 後，刪除 Media 應因 Restrict 外鍵失敗。
測試檔使用 `import Database from 'better-sqlite3'`、`readFileSync/readdirSync/statSync` 與 `join`；將下列片段包在一個 Vitest `it('creates entries and enforces relation deletes', ...)` 中，並以 `try/finally` 關閉 `db`：

```ts
const migrationRoot = join(process.cwd(), 'prisma/migrations')
const db = new Database(':memory:')
db.pragma('foreign_keys = ON')
for (const dir of readdirSync(migrationRoot).filter((name) => statSync(join(migrationRoot, name)).isDirectory()).sort()) {
  db.exec(readFileSync(join(migrationRoot, dir, 'migration.sql'), 'utf8'))
}
const columns = new Set((db.pragma('table_info("FeatureEntry")') as Array<{ name: string }>).map((column) => column.name))
for (const column of ['siteId', 'featureId', 'title', 'content', 'contentType', 'youtubeUrl', 'mediaId', 'createdAt', 'updatedAt']) {
  expect(columns.has(column), `missing FeatureEntry.${column}`).toBe(true)
}

const siteId = Number(db.prepare('INSERT INTO "Site" ("name", "slug", "updatedAt") VALUES (?, ?, ?)').run('Site A', 'site-a', '2026-09-24').lastInsertRowid)
const featureId = Number(db.prepare('INSERT INTO "FeatureDefinition" ("key", "label", "path") VALUES (?, ?, ?)').run('faq-center', 'FAQ', 'faq-center').lastInsertRowid)
db.prepare('INSERT INTO "FeatureEntry" ("siteId", "featureId", "title", "contentType", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)').run(siteId, featureId, 'Entry', 'text', '2026-09-24', '2026-09-24')
db.prepare('DELETE FROM "FeatureDefinition" WHERE "id" = ?').run(featureId)
expect(db.prepare('SELECT COUNT(*) AS count FROM "FeatureEntry"').get()).toEqual({ count: 0 })

const imageFeatureId = Number(db.prepare('INSERT INTO "FeatureDefinition" ("key", "label", "path") VALUES (?, ?, ?)').run('gallery', 'Gallery', 'gallery').lastInsertRowid)
const mediaId = Number(db.prepare('INSERT INTO "Media" ("siteId", "filename", "url", "type") VALUES (?, ?, ?, ?)').run(siteId, 'image.jpg', '/uploads/image.jpg', 'image').lastInsertRowid)
db.prepare('INSERT INTO "FeatureEntry" ("siteId", "featureId", "title", "contentType", "mediaId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?)').run(siteId, imageFeatureId, 'Photo', 'image', mediaId, '2026-09-24', '2026-09-24')
expect(() => db.prepare('DELETE FROM "Media" WHERE "id" = ?').run(mediaId)).toThrow()
```

- [x] **Step 2: 執行測試確認 migration 尚未建立 FeatureEntry**

Run: `npm test -- src/lib/featureEntryMigration.test.ts`
Expected: FAIL，現有 migrations 執行後 `FeatureEntry` table 不存在。

- [x] **Step 3: 新增 Prisma relations 與 FeatureEntry model**

在 `Site`、`FeatureDefinition`、`Media` 分別新增 relation 欄位；新增 `FeatureEntry`，SQLite 字串欄位 `contentType` 預設 `text`，必要關聯使用 `onDelete: Cascade`，媒體關聯使用 `onDelete: Restrict`。

- [x] **Step 4: 產生並檢查 migration**

Run: `npx prisma migrate dev --name add_feature_entries`
Expected: 新 migration 只建立 FeatureEntry、索引及外鍵，不重建或改寫既有 Page/Post 表。

- [x] **Step 5: 驗證 Prisma client 與 migration**

Run: `npx prisma validate; npx prisma generate; npx prisma migrate status`
Expected: schema valid、client 有 `prisma.featureEntry`、本機 migration up to date；`npm test -- src/lib/featureEntryMigration.test.ts` PASS，且 migration 不修改 Page/Post。

### Task 3: FeatureEntry CRUD API 與權限測試

**Files:**
- Create: `src/app/api/[siteSlug]/admin/feature-entries/[featurePath]/route.ts`
- Create: `src/app/api/[siteSlug]/admin/feature-entries/[featurePath]/[entryId]/route.ts`
- Test: 上述兩個 route 各自的 `route.test.ts`
- Modify: `src/lib/featureEntryValidation.ts`

**Interfaces:**
- Collection route context: `Promise<{ siteSlug: string; featurePath: string }>`。
- Detail route context: `Promise<{ siteSlug: string; featurePath: string; entryId: string }>`。
- Collection `GET` 回傳本站該功能項目，依 `updatedAt desc` 排序；`POST` 建立並回 201。
- Detail `GET`、`PATCH`、`DELETE` 均以 `{ id, siteId, featureId }` 查詢，禁止只依 id 查詢；FeatureEntry delete 使用 `write` 權限，所以 editor 也可刪除單筆功能資料。

- [x] **Step 1: 先寫 POST/GET collection 的失敗測試**

使用 Vitest mock `requireContentPermission` 與 Prisma，明確加入文字成功、缺標題、跨站圖片 mediaId、停用 feature 四個案例：

測試 helper `post(body)` 建立 `Request`，並以 `{ params: Promise.resolve({ siteSlug: 'site-a', featurePath: 'faq-center' }) }` 呼叫 POST route。
在 `vi.hoisted` 定義 `create`、`mediaFindFirst`、`siteFeatureFindFirst`、`requireContentPermission` spies；每個測試初始化本站 id 7、啟用 feature id 3、site media id 44，並在跨站案例將 media siteId 改為 8。

```ts
expect(create).toHaveBeenCalledWith({
  data: expect.objectContaining({ siteId: 7, featureId: 3, title: '會議摘要', contentType: 'text' }),
})
expect(response.status).toBe(201)

const missingTitle = await post({ title: '', contentType: 'text', content: '內容' })
expect(missingTitle.status).toBe(400)

mediaFindFirst.mockResolvedValue({ id: 44, siteId: 8 })
const crossSiteImage = await post({ title: '外站圖片', contentType: 'image', mediaId: 44 })
expect(crossSiteImage.status).toBe(400)

siteFeatureFindFirst.mockResolvedValue(null)
const disabledFeature = await post({ title: '停用功能', contentType: 'text', content: '內容' })
expect(disabledFeature.status).toBe(404)
```

- [x] **Step 2: 執行測試確認失敗**

Run: `npm test -- "src/app/api/[siteSlug]/admin/feature-entries"`
Expected: FAIL，FeatureEntry route 尚不存在。

- [x] **Step 3: 實作 collection GET/POST**

使用 `requireContentPermission(siteSlug, 'read'|'write')`；依 siteSlug 查 Site，依 SiteFeature relation 同時查 featurePath、siteId、enabled=true；mediaId 另確認 `Media.siteId === site.id`。只允許 `text`、`youtube`、`image`，文字型態要求非空 content，youtube 要求合法 YouTube URL，image 要求有效同站 mediaId。

- [x] **Step 4: 實作 detail GET/PATCH/DELETE**

所有動作先取得本站啟用功能，再用 `where: { id: entryId, siteId, featureId }` 查 entry。更新只接受 schema 中欄位；mediaId 更新時重新確認本站 ownership。FeatureEntry 單筆 DELETE 使用 `requireContentPermission(siteSlug, 'write')`，確保 editor、site admin 與 global admin 可刪除，viewer 不可刪除。

- [x] **Step 5: 加入 detail route 測試並跑 CRUD 測試**

測試跨站 entryId 不可讀寫／刪除；editor 可建立、修改、刪除；viewer 寫入與刪除回 403；mediaId 跨站回 400/404；成功刪除只刪目標 entry。

Run: `npm test -- "src/app/api/[siteSlug]/admin/feature-entries"`
Expected: 所有 CRUD、驗證、多租戶及權限案例通過。

### Task 4: 擴充媒體可見性與媒體刪除保護

**Files:**
- Modify: `src/lib/mediaAccess.ts`
- Test: `src/lib/mediaAccess.test.ts`
- Modify: `src/app/api/[siteSlug]/admin/assets/[id]/route.ts`
- Test: `src/app/api/[siteSlug]/admin/assets/[id]/route.test.ts`
- Test: `src/app/uploads/[filename]/route.test.ts`

**Interfaces:**
- `resolveMediaVisibility(siteId, mediaId)` 將查到的 FeatureEntry 圖片引用依啟用功能的 visibility 標記為 public/member。
- 刪除媒體前如有本站 FeatureEntry 引用，回 409 並保留媒體與所有 entry。

- [x] **Step 1: 寫 media visibility 失敗測試**

Mock `featureEntry.findMany` 回傳圖片 entry 與 feature key；對 public feature 預期 `{ publicReference: true, memberReference: false }`，對 members feature 預期相反；無關聯時兩者 false。

- [x] **Step 2: 執行測試確認失敗**

Run: `npm test -- src/lib/mediaAccess.test.ts`
Expected: 新增 FeatureEntry 引用案例失敗，既有媒體案例維持原狀。

- [x] **Step 3: 將 FeatureEntry 引用納入可見性判定**

在 `resolveMediaVisibility` 查詢本站 `mediaId` 的 FeatureEntry，include feature key，透過既有 visibility map `markFeature(feature.key)`；未啟用 feature key 不可增加 public/member reference。

- [x] **Step 4: 防止刪除仍被引用的媒體**

在 media delete transaction 中查詢 `featureEntry.findFirst({ where: { siteId, mediaId }, select: { id: true } })`，與現有 SiteHome/Vendor/Map/attachment reference 一起判斷；存在時回 409。

- [x] **Step 5: 執行媒體測試**

Run: `npm test -- src/lib/mediaAccess.test.ts "src/app/api/[siteSlug]/admin/assets/[id]/route.test.ts" "src/app/uploads/[filename]/route.test.ts"`
Expected: FeatureEntry image 對外可見性跟 feature visibility 一致；被引用媒體無法刪除；未登入使用者不能以猜測的 media URL 讀取 members feature 圖片。

### Task 5: 側欄列出所有啟用功能

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/lib/features.ts`
- Modify: `src/lib/features.test.ts`

**Interfaces:**
- Produces `getSiteAdminFeatureLinks(siteSlug, features)` 回傳依輸入順序建立的 `{ href, label, icon }[]`。
- Sidebar 每個啟用 feature item 導向 `/{siteSlug}/admin/{feature.path}`；固定的首頁、成員管理與功能設定連結保持不變。

- [x] **Step 1: 先寫 Sidebar feature projection 測試**

新增純函式 `getSiteAdminFeatureLinks(siteSlug, features)`，測試確認它將所有輸入 feature（包含 custom key）映射成 href/label/icon 並保留順序；側欄改用該函式，不再透過 `getImplementedAdminFeatures` 過濾。

至少使用以下 assertion 驗證自訂項目與順序：

```ts
expect(getSiteAdminFeatureLinks('site-a', [
  { key: 'custom', path: 'faq-center', label: '常見問題', icon: '❓' },
])).toEqual([{ href: '/site-a/admin/faq-center', label: '常見問題', icon: '❓' }])
```

- [x] **Step 2: 執行 Sidebar projection 測試確認失敗**

Run: `npm test -- src/lib/features.test.ts`
Expected: custom feature 目前仍被 `getImplementedAdminFeatures` 過濾，因此新 assertion FAIL。

- [x] **Step 3: 更新 Sidebar**

新增 `getSiteAdminFeatureLinks`，將所有 layout 傳入的 enabled features 映射成連結。`Sidebar` 使用此 helper，移除 `getImplementedAdminFeatures` import 與對應 filter；固定連結維持現狀。

- [x] **Step 4: 執行側欄測試**

Run: `npm test -- src/lib/features.test.ts`
Expected: custom 及 system 啟用項目都在結果中，順序、URL、label、icon 正確。

### Task 6: 通用後台資料管理清單與表單

**Files:**
- Create: `src/app/[siteSlug]/admin/[...featureRoute]/page.tsx`
- Create: `src/app/[siteSlug]/admin/[...featureRoute]/FeatureEntryList.tsx`
- Create: `src/app/[siteSlug]/admin/[...featureRoute]/FeatureEntryForm.tsx`
- Create: `src/lib/featureAdminRoute.ts`
- Test: `src/lib/featureAdminRoute.test.ts`

**Interfaces:**
- `resolveFeatureAdminRouteSegments(segments: string[])` 回傳 `{ featurePath: string; view: 'list' | 'new' | 'edit'; entryId: number | null }`，非有效形狀拋出錯誤。
- 通用管理 page 依 `[featurePath]` 顯示 list、`[featurePath,'new']` 顯示 create、`[featurePath,entryId,'edit']` 顯示 edit；停用或不存在的功能呼叫 `notFound()`。
- `FeatureEntryFormValue = { id: number; title: string; content: string | null; contentType: 'text' | 'youtube' | 'image'; youtubeUrl: string | null; mediaId: number | null; mediaUrl: string | null }`。

- [x] **Step 1: 寫通用後台路由解析測試**

測試 `['faq-center']` 得 list、`['faq-center','new']` 得 new、`['faq-center','12','edit']` 得 edit/id 12；空陣列、entryId 非正整數、錯誤段數皆拋出 `Invalid feature admin route`。

- [x] **Step 2: 執行測試確認失敗**

Run: `npm test -- src/lib/featureAdminRoute.test.ts`
Expected: FAIL，路由解析 helper 尚未實作。

- [x] **Step 3: 實作 route parser 與 server page**

實作 `resolveFeatureAdminRouteSegments` 並在 catch-all server page 解析 params。以 siteSlug 查 Site，按 featurePath 查該 SiteFeature 並要求 enabled=true；無效功能或 segment 呼叫 `notFound()`。若 `feature.key` 是 `pages` 或 `posts`，載入既有 Page/Post records 並 render LegacyPagePostManager；其他功能才查 FeatureEntry 並 render通用 CRUD component。

- [x] **Step 4: 實作 FeatureEntryList**

載入 collection GET，顯示 title、contentType、updatedAt；提供新增連結、編輯連結與確認後刪除。API 錯誤顯示繁體中文回應，成功後 `router.refresh()`。

- [x] **Step 5: 實作 FeatureEntryForm**

text 顯示 title/content 並要求內文；youtube 顯示 title/可選說明/youtubeUrl；image 使用現有 `/api/{siteSlug}/admin/assets` FormData 上傳並設定 altText 為 title，再把回傳 mediaId 寫入 FeatureEntry。編輯既有圖片時保留 mediaId，只有選新檔時才上傳替換。

- [x] **Step 6: 驗證後台 catch-all 與既有靜態 routes**

Run: `npm test -- src/lib/featureAdminRoute.test.ts src/lib/features.test.ts`; `npm run build`
Expected: static `admin/announcement` 等仍使用專屬頁；未匹配且啟用的自訂路徑進通用 CRUD 頁；Next.js TypeScript route validation 成功。

### Task 7: 舊 Pages/Posts 功能管理相容

**Files:**
- Modify/Test: `src/app/api/[siteSlug]/admin/pages/route.ts` and `route.test.ts`
- Create/Test: `src/app/api/[siteSlug]/admin/pages/[id]/route.ts` and `route.test.ts`
- Modify/Test: `src/app/api/[siteSlug]/admin/posts/route.ts` and `route.test.ts`
- Create/Test: `src/app/api/[siteSlug]/admin/posts/[id]/route.ts` and `route.test.ts`
- Create: `src/app/[siteSlug]/admin/[...featureRoute]/LegacyPagePostManager.tsx`
- Modify: `src/app/[siteSlug]/admin/[...featureRoute]/page.tsx`

**Interfaces:**
- Legacy manager accepts `{ siteSlug: string; featureKey: 'pages' | 'posts'; initial: PageRecord[] | PostRecord[]; canWrite: boolean }`。
- Pages use existing `GET/POST /api/{siteSlug}/admin/pages` plus item `PATCH/DELETE /api/{siteSlug}/admin/pages/{id}`。
- Posts use existing `GET/POST /api/{siteSlug}/admin/posts` plus item `PATCH/DELETE /api/{siteSlug}/admin/posts/{id}`。

- [x] **Step 1: 寫 legacy Page/Post item API 測試**

Pages/Post item GET/PATCH/DELETE tests 必須指定 `siteId` 和 id；POST/PATCH 欄位分別使用現有 Page title/slug/content 與 Post title/slug/content/published。editor 可寫入與刪除，viewer 的寫入／刪除回 403；重複本站 slug 回 409，其他站相同 slug 不衝突。

- [x] **Step 2: 執行測試確認 item routes 尚未建立**

Run: `npm test -- "src/app/api/[siteSlug]/admin/pages" "src/app/api/[siteSlug]/admin/posts"`
Expected: item route tests FAIL，因 `[id]/route.ts` 尚不存在。

- [x] **Step 3: 統一 collection API 的站點角色檢查**

將現有 pages/posts GET 改用 `requireContentPermission('read')`，POST 改用 `requireContentPermission('write')`；保留同站 slug duplicate checks、Page/Post 原欄位與 Posts `published` Boolean。

- [x] **Step 4: 實作 Pages/Post item PATCH 與 DELETE routes**

建立兩個 `[id]/route.ts`，GET 可省略；解析 positive id，以 `where: { id, siteId }` 讀取／更新／刪除；Page/Post PATCH 只更新傳入欄位，slug 更新時先查本站相同 slug 的其他 record。DELETE 沿用本功能已確認的 write 權限，editor 可刪除。

- [x] **Step 5: 實作 LegacyPagePostManager**

Pages 表單提供 title/slug/content；Posts 另外提供 published checkbox。清單提供新增、編輯、刪除，使用既有 collection endpoint 及新 item endpoints；編輯舊 `pages`／`posts` feature 時保留 path，路徑輸入停用。

- [x] **Step 6: 驗證 legacy CRUD 與前台相容**

Run: `npm test -- "src/app/api/[siteSlug]/admin/pages" "src/app/api/[siteSlug]/admin/posts"`; `npm run build`
Expected: Page records 儲存後即由既有 pages 路由顯示；Post records 只有 published=true 由既有 posts 路由顯示；兩者不得建立 FeatureEntry。

### Task 8: 前台清單、詳情與 YouTube／圖片呈現

**Files:**
- Modify: `src/app/(public)/[siteSlug]/[...featurePath]/page.tsx`
- Create: `src/lib/featureEntryDisplay.ts`
- Test: `src/lib/featureEntryDisplay.test.ts`

**Interfaces:**
- `resolveFeatureEntryRouteSegments(segments: string[])` 回傳 `{ featurePath: string; entryId: number | null }`，只接受一段功能路徑或功能路徑加正整數 entryId。
- list route `/{siteSlug}/{featurePath}`，detail route `/{siteSlug}/{featurePath}/{entryId}`。
- YouTube renderer 使用 `parseYouTubeVideoId` 的結果組成 privacy-enhanced embed URL，不使用原始輸入作 src。

- [x] **Step 1: 寫 public route parsing/display helper 測試**

測試 `["gallery"]` 解析為列表，`["gallery","12"]` 解析為 detail id 12；空 segment、非數字 id、多於兩段回 notFound/error。測試 youtube embed builder 僅接受 validated video ID。

- [x] **Step 2: 執行測試確認失敗**

Run: `npm test -- src/lib/featureEntryDisplay.test.ts`
Expected: FAIL，helper 尚未存在。

- [x] **Step 3: 實作 public list/detail page**

查找目前 site 並確認 active；以 path 查詢已啟用 feature，呼叫 `requirePublicFeature(siteSlug, feature.key)` 檢查公開／members 權限。列表查詢限定 `siteId` 和 `featureId`，版面遵守 displayMode、功能導覽順序遵守 SiteFeature.sortOrder、功能內資料依 createdAt 遞減排序；詳情用相同 siteId/featureId + entryId 查詢，查無資料 notFound。Entry include media 的 `url`、`altText` 供圖片 render。

- [x] **Step 4: 呈現各內容類型**

text 顯示標題與內文；youtube 顯示標題、可選說明與 `youtube-nocookie.com/embed/{videoId}` iframe；image include Media 顯示圖與 Media.altText 或 title fallback。清單各項連結至 feature path + entry id。

- [x] **Step 5: 跑 display/site tests**

Run: `npm test -- src/lib/featureEntryDisplay.test.ts`; `npm run build`
Expected: segment parsing、資料路由與型別檢查通過；未啟用或非本站資料永不被呈現。

### Task 9: 功能刪除級聯與確認文案

**Files:**
- Modify: `src/app/api/admin/features/[id]/route.ts`
- Test: `src/app/api/admin/features/[id]/route.test.ts`
- Modify: `src/app/(dashboard)/admin/features/FeatureClient.tsx`

**Interfaces:**
- DELETE 成功後 FeatureDefinition relation cascade 刪除所有 FeatureEntry 與 SiteFeature。
- 確認對話文案須包含功能名稱以及「所有子網站資料會一併刪除」。

- [x] **Step 1: 寫 DELETE feature route 測試**

測試系統、自訂及舊 pages/posts feature 均可刪除；entry rows cascade 由 migration integration test 驗證；pages/posts key 會額外呼叫 Page/Post.deleteMany；不存在 id 回 404、未登入回 403。另 mock Prisma transaction，要求所有設定與資料刪除都透過 tx 執行。

- [x] **Step 2: 執行 route test 確認缺少預期行為**

Run: `npm test -- src/app/api/admin/features/[id]/route.test.ts`
Expected: 新增 atomic-delete／legacy-data assertions FAIL，因現有 handler 未在 transaction 內處理全部 legacy data。

- [x] **Step 3: 更新刪除確認訊息並驗證刪除順序**

Client 使用 `confirm('確定刪除「${feature.label}」？此功能在所有子網站的資料也會一併刪除。')`。API 在 Prisma transaction 內依 key 刪除舊 Page/Post rows（key 為 pages/posts 時）、SiteFeature rows 與 FeatureDefinition；FeatureEntry FK cascade 完成自訂資料清理。

- [x] **Step 4: 跑 feature deletion tests**

Run: `npm test -- src/app/api/admin/features/[id]/route.test.ts`
Expected: 刪除完成、所有關聯資料不殘留；錯誤時 transaction rollback。

### Task 10: 全量驗收與 migration review

**Files:**
- Verify: migration folder ending `_add_feature_entries` under `prisma/migrations/`
- Verify: `src/app/api/[siteSlug]/admin/feature-entries/[featurePath]/route.ts`
- Verify: `src/app/api/[siteSlug]/admin/feature-entries/[featurePath]/[entryId]/route.ts`
- Verify: `src/app/[siteSlug]/admin/[...featureRoute]/page.tsx`
- Verify: `src/app/(public)/[siteSlug]/[...featurePath]/page.tsx`
- Verify: `src/lib/mediaAccess.ts`

- [x] **Step 1: 執行全量測試**

Run: `npm test`
Expected: 所有 tests 通過，含 API 權限、跨站 isolation、YouTube 驗證、media visibility、sidebar projection。

- [x] **Step 2: 執行 lint 與 production build**

Run: `npm run lint`; `npm run build`
Expected: 無 lint errors；build 與 Next.js TypeScript route validation 成功。

- [x] **Step 3: 檢查 migration**

確認 migration 只新增 FeatureEntry 與外鍵／索引，不改動既有 Page/Post 資料；在獨立測試 DB apply migration，測試 feature delete cascade 及 media restrict。

- [x] **Step 4: 檢查驗收矩陣**

驗證 enabled/disabled、public/members、admin/editor/viewer、文字/YouTube/圖片、兩個不同站點，以及 feature deletion cascade 的組合；正式部署 migration 前先依 AGENTS.md 做 SQLite 線上備份與 quick_check。

## 執行記錄

- 狀態：已完成並部署。
- 完成提交：`778a485 feat: add data management for enabled site features`；已合併至 `main` 並推送至 `origin/main`。
- 驗證：`npm test` 86 項通過；`npm run build` 成功；Lint 無錯誤（6 項既存警告）。
- Migration：`20260924050650_add_feature_entries` 已部署；正式資料庫 migration status 為最新。
- 備份：正式 `data/prod.db` 線上備份的 `quick_check` 為 `ok`。
- 服務：`multi-site-app` 為 `running / healthy`；正式 HTTPS 首頁回應 200 並導向登入頁。
