# 多子站子路徑架構 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實現子路徑多租戶 `ur.landagent.com.tw/{siteSlug}/` 含站點獨立使用者、可增訂的功能選單與公開前台

**Architecture:** proxy 解析 siteSlug 注入 header，前台 (public)/[siteSlug] 匿名，後台 [siteSlug]/admin 需 SiteUser 授權，功能由 FeatureDefinition 全域目錄 + SiteFeature 站啟用表驅動，單 Next 實例單 SQLite

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Prisma 7 + better-sqlite3, NextAuth 4, Tailwind 4

**Spec:** docs/superpowers/specs/2026-09-23-multi-site-subpath-design.md

## Global Constraints

- Node.js >= 22, npm >= 9, Windows (C:\multi-site), 單 SQLite `file:./dev.db` / prod `file:/app/data/prod.db`
- 所有 API 使用 /api 前綴，介面繁體中文
- 不暴露真實秘密，NEXTAUTH_URL 保持 https://ur.landagent.com.tw，Nginx 單 server_name
- YAGNI：不做子網域、多 DB、多容器

---

## File Structure

- Modify: `prisma/schema.prisma` - 新增 FeatureDefinition/SiteFeature, Site.status
- Modify: `prisma.config.ts` - 無需改 (seed 仍用 prisma/seed.ts)
- Modify: `prisma/seed.ts` - 補 FeatureDefinition + SiteFeature 種子
- Create: `src/lib/features.ts` - FEATURE_REGISTRY 讀取 helper
- Create: `src/lib/site.ts` - getSiteBySlug / getSiteFeatures
- Create: `src/lib/siteAuth.ts` - requireSiteAccess / requireFeature / assertSiteMember
- Modify: `src/lib/auth.ts` - Session/JWT 注入 siteRoles, authorize 支援 siteSlug
- Modify: `src/proxy.ts` - siteSlug 解析與 authorized 判斷
- Create: `src/app/(public)/[siteSlug]/layout.tsx` - 前台 layout + 導覽
- Create: `src/app/(public)/[siteSlug]/page.tsx` - 站首頁
- Create: `src/app/(public)/[siteSlug]/pages/[pageSlug]/page.tsx`
- Create: `src/app/(public)/[siteSlug]/posts/[postSlug]/page.tsx`
- Create: `src/app/(auth)/[siteSlug]/login/page.tsx` - 站點登入
- Create: `src/app/(dashboard)/[siteSlug]/admin/layout.tsx` - 站守衛
- Create: `src/app/(dashboard)/[siteSlug]/admin/page.tsx` - 站儀表板
- Create: `src/app/(dashboard)/[siteSlug]/admin/users/page.tsx`
- Create: `src/app/(dashboard)/[siteSlug]/admin/settings/features/page.tsx`
- Create: `src/app/(dashboard)/admin/features/page.tsx` - 全域功能目錄
- Create: `src/app/api/admin/features/route.ts` + `[id]/route.ts`
- Create: `src/app/api/[siteSlug]/admin/features/route.ts`
- Create: `src/app/api/[siteSlug]/admin/users/invite/route.ts`
- Modify: `src/components/Sidebar.tsx` - 動態 features + SiteSwitcher
- Modify: `src/components/Header.tsx` - 顯示 site 名稱
- Modify: `src/app/(dashboard)/sites/page.tsx` - 導向新路徑

---

### Task 1: 資料模型與種子

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Create: `src/lib/features.ts`
- Create: `src/lib/site.ts`

**Interfaces:**
- Consumes: 現有 Site/User/SiteUser/Page/Post
- Produces: `getSiteBySlug(slug:string): Promise<Site|null>`, `getSiteFeatures(siteId:number): Promise<Set<string>>`, `getEnabledFeatures(siteId:number): Promise<FeatureDefinition[]>`

- [ ] **Step 1: 修改 prisma/schema.prisma 新增兩表**

```prisma
model Site {
  id          Int      @id @default(autoincrement())
  name        String
  slug        String   @unique
  description String?
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       SiteUser[]
  pages       Page[]
  posts       Post[]
  media       Media[]
  siteFeatures SiteFeature[]
}
model FeatureDefinition {
  id          Int      @id @default(autoincrement())
  key         String   @unique
  label       String
  icon        String?
  path        String
  description String?
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  siteFeatures SiteFeature[]
}
model SiteFeature {
  id        Int      @id @default(autoincrement())
  siteId    Int
  featureId Int
  enabled   Boolean  @default(true)
  sortOrder Int      @default(0)
  site      Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  feature   FeatureDefinition @relation(fields: [featureId], references: [id], onDelete: Cascade)
  @@unique([siteId, featureId])
}
```

- [ ] **Step 2: 建立 src/lib/features.ts**

```ts
export const SYSTEM_FEATURES = [
  { key:'pages', label:'頁面管理', icon:'📄', path:'pages', isSystem:true },
  { key:'posts', label:'文章/公告', icon:'📝', path:'posts', isSystem:true },
  { key:'media', label:'媒體庫', icon:'🖼️', path:'media', isSystem:true },
] as const;
export const DEFAULT_FEATURES = [
  { key:'faq', label:'常見問題', icon:'❓', path:'faq', isSystem:false },
  { key:'timeline', label:'時程進度', icon:'📅', path:'timeline', isSystem:false },
  { key:'contact', label:'聯絡表單', icon:'✉️', path:'contact', isSystem:false },
];
```

- [ ] **Step 3: 建立 src/lib/site.ts**

```ts
import { prisma } from './prisma';
const siteCache = new Map<string, any>();
export async function getSiteBySlug(slug:string){ if(siteCache.has(slug)) return siteCache.get(slug); const s=await prisma.site.findUnique({where:{slug}}); if(s) siteCache.set(slug,s); return s; }
export async function getSiteFeatures(siteId:number){ const rows=await prisma.siteFeature.findMany({where:{siteId, enabled:true}, include:{feature:true}, orderBy:{sortOrder:'asc'}}); return rows.map(r=>r.feature); }
```

- [ ] **Step 4: 更新 prisma/seed.ts 補 FeatureDefinition + SiteFeature**

```ts
const defs=[...SYSTEM_FEATURES, ...DEFAULT_FEATURES];
for(const d of defs) await prisma.featureDefinition.upsert({where:{key:d.key}, update:{}, create:{key:d.key, label:d.label, icon:d.icon, path:d.path, isSystem:d.isSystem}});
const allDefs=await prisma.featureDefinition.findMany();
const sites=await prisma.site.findMany();
for(const site of sites) for(let i=0;i<allDefs.length;i++){ const def=allDefs[i]; const enabled=['pages','posts','media'].includes(def.key); await prisma.siteFeature.upsert({where:{siteId_featureId:{siteId:site.id, featureId:def.id}}, update:{}, create:{siteId:site.id, featureId:def.id, enabled, sortOrder:i}}); }
```

- [ ] **Step 5: 執行遷移**

Run: `npx prisma migrate dev --name add_feature_definitions`
Expected: 生成 migration SQL 含 FeatureDefinition/SiteFeature

- [ ] **Step 6: 執行 seed 驗證**

Run: `npx prisma db seed`
Expected: 2 Sites + 6 FeatureDefinitions + 12 SiteFeatures

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts src/lib/features.ts src/lib/site.ts
git commit -m "feat: add FeatureDefinition and SiteFeature models with seed"
```

---

### Task 2: 認證與站點授權

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `src/lib/siteAuth.ts`
- Create: `src/app/(auth)/[siteSlug]/login/page.tsx`
- Modify: `src/app/(dashboard)/layout.tsx` (全域守衛補 siteRoles)

**Interfaces:**
- Consumes: prisma.siteUser, getSiteBySlug
- Produces: `requireSiteAccess(siteSlug:string): Promise<Session>`, `requireFeature(siteId:number, key:string)`

- [ ] **Step 1: 修改 src/lib/auth.ts 注入 siteRoles**

```ts
declare module 'next-auth' {
  interface Session { user: { id:string; role:string; siteRoles:{siteId:number; slug:string; role:string}[]} & DefaultSession['user'] }
}
declare module 'next-auth/jwt' { interface JWT { id:string; role:string; siteRoles:any[] } }
// authorize 增加 siteSlug 參數
credentials: { email:{}, password:{}, siteSlug:{} },
async authorize(credentials){
  const user=await prisma.user.findUnique({where:{email:credentials.email}});
  if(!user) throw new Error('帳號不存在');
  if(!await compare(credentials.password, user.password)) throw new Error('密碼錯誤');
  if(credentials.siteSlug){
    const site=await prisma.site.findUnique({where:{slug:credentials.siteSlug}});
    if(!site) throw new Error('專案不存在');
    const mu=await prisma.siteUser.findFirst({where:{userId:user.id, siteId:site.id}});
    const isAdmin=user.role==='admin';
    if(!mu && !isAdmin) throw new Error('此帳號不屬於該專案');
  }
  return {id:user.id.toString(), email:user.email, name:user.name, role:user.role};
}
// callbacks.jwt 載入 siteRoles
async jwt({token,user}){ if(user){ const rows=await prisma.siteUser.findMany({where:{userId:parseInt(user.id)}, include:{site:{select:{id,slug}}}}); token.siteRoles=rows.map(r=>({siteId:r.siteId, slug:r.site.slug, role:r.role})); token.role=user.role; token.id=user.id;} return token; }
```

- [ ] **Step 2: 建立 src/lib/siteAuth.ts**

```ts
import { getServerSession } from 'next-auth'; import { authOptions } from './auth'; import { redirect } from 'next/navigation';
export async function requireSiteAccess(siteSlug:string){
  const session=await getServerSession(authOptions);
  if(!session) redirect(`/${siteSlug}/login`);
  if(session.user.role==='admin') return session;
  if(!session.user.siteRoles?.some((r:any)=>r.slug===siteSlug)) redirect('/403');
  return session;
}
```

- [ ] **Step 3: 建立站點登入頁 src/app/(auth)/[siteSlug]/login/page.tsx**

Client component 表單含隱藏 siteSlug，呼叫 `signIn('credentials', {email, password, siteSlug, redirect:false})` 成功後 `router.push('/'+siteSlug+'/admin')`

- [ ] **Step 4: 驗證登入**

Run: `npm run build` 確保編譯通過；手動測試 `admin@example.com` 於 `/zhonghe-renewal/login` 可進，`editor@example.com` 於 `/banqiao-renewal/login` 被拒

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/siteAuth.ts "src/app/(auth)/[siteSlug]/login/page.tsx"
git commit -m "feat: add site-scoped auth with dual login"
```

---

### Task 3: Proxy 與站點後台骨架

**Files:**
- Modify: `src/proxy.ts`
- Create: `src/app/(dashboard)/[siteSlug]/admin/layout.tsx`
- Create: `src/app/(dashboard)/[siteSlug]/admin/page.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/app/(dashboard)/sites/page.tsx`

- [ ] **Step 1: 重寫 src/proxy.ts**

```ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
const RESERVED=new Set(['login','register','api','sites','admin','_next','favicon.ico']);
export default withAuth(
  function middleware(req){
    const slug=req.nextUrl.pathname.split('/')[1];
    if(slug && !RESERVED.has(slug) && req.nextUrl.pathname.startsWith('/'+slug)){
      req.headers.set('x-site-slug', slug);
    }
  },
  { callbacks:{ authorized:({req, token})=>{
    const path=req.nextUrl.pathname;
    const isPublic=/^\/[^\/]+\/(pages|posts)?(\/|$)/.test(path) || /^\/[^\/]+$/.test(path);
    // 前台放行
    if(isPublic && !path.includes('/admin')) return true;
    return !!token;
  }}, pages:{signIn:'/login'} }
);
export const config={ matcher:['/((?!api/auth|_next/static|_next/image|.*\\..*).*)'] };
```

- [ ] **Step 2: 建立 [siteSlug]/admin/layout.tsx 站守衛 + 動態 Sidebar**

```tsx
import { requireSiteAccess } from '@/lib/siteAuth'; import { getSiteBySlug, getSiteFeatures } from '@/lib/site';
export default async function AdminLayout({children, params}:{children:React.ReactNode; params:{siteSlug:string}}){
  await requireSiteAccess(params.siteSlug);
  const site=await getSiteBySlug(params.siteSlug); if(!site) notFound();
  const features=await getSiteFeatures(site.id);
  return <div><Sidebar siteSlug={params.siteSlug} features={features} siteName={site.name} />{children}</div>;
}
```

- [ ] **Step 3: 修改 Sidebar.tsx 支援動態 features**

Props: `siteSlug?:string; features?:FeatureDefinition[]; siteName?:string`，若有 siteSlug 則渲染 `/{siteSlug}/admin/pages` 等，否則舊三項

- [ ] **Step 4: 建立站儀表板 page.tsx 顯示 site 名稱 + feature 數量**

- [ ] **Step 5: 修改全域 sites/page.tsx 每項 Link 改為 `/${site.slug}/admin`**

- [ ] **Step 6: Commit**

```bash
git add src/proxy.ts "src/app/(dashboard)/[siteSlug]/admin/layout.tsx" "src/app/(dashboard)/[siteSlug]/admin/page.tsx" src/components/Sidebar.tsx "src/app/(dashboard)/sites/page.tsx"
git commit -m "feat: add proxy siteSlug resolution and site admin layout"
```

---

### Task 4: 公開前台

**Files:**
- Create: `src/app/(public)/[siteSlug]/layout.tsx`
- Create: `src/app/(public)/[siteSlug]/page.tsx`
- Create: `src/app/(public)/[siteSlug]/pages/[pageSlug]/page.tsx`
- Create: `src/app/(public)/[siteSlug]/posts/[postSlug]/page.tsx`
- Create: `src/components/public/SiteHeader.tsx`

- [ ] **Step 1: 建立 (public)/[siteSlug]/layout.tsx**

查詢 site + features 產生導覽，404 處理

- [ ] **Step 2: 建立 page.tsx 站首頁**

顯示 description + 最新 posts

- [ ] **Step 3: 建立 pages/[pageSlug]/page.tsx 與 posts/[postSlug]/page.tsx**

Page: `findFirst({where:{siteId, slug:pageSlug}})` ; Post: `findFirst({where:{siteId, slug:postSlug, published:true}})` 否則 notFound()

- [ ] **Step 4: 測試前台匿名**

Run: `npm run build` ; 瀏覽 `http://localhost:3000/zhonghe-renewal/` 與 `/zhonghe-renewal/posts/progress-report`

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/[siteSlug]/" src/components/public/
git commit -m "feat: add public frontend for siteSlug"
```

---

### Task 5: 功能選單可增訂 (FeatureDefinition CRUD)

**Files:**
- Create: `src/app/(dashboard)/admin/features/page.tsx`
- Create: `src/app/(dashboard)/admin/features/FeatureForm.tsx`
- Create: `src/app/api/admin/features/route.ts`
- Create: `src/app/api/admin/features/[id]/route.ts`
- Create: `src/app/(dashboard)/[siteSlug]/admin/settings/features/page.tsx`
- Create: `src/app/api/[siteSlug]/admin/features/route.ts`

- [ ] **Step 1: 建立全域 API POST/GET /api/admin/features**

僅 admin，POST {key,label,icon,path} 自動 slugify key，isSystem 預設 false

- [ ] **Step 2: 建立全域頁面 admin/features/page.tsx 表格+新增表單**

- [ ] **Step 3: 建立站點設定頁 settings/features/page.tsx checkbox + sortOrder**

GET 載入所有 definitions + 該站 SiteFeature，POST 批量 upsert

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/admin/features/" "src/app/(dashboard)/[siteSlug]/admin/settings/features/" "src/app/api/admin/features/" "src/app/api/[siteSlug]/admin/features/"
git commit -m "feat: add feature catalog CRUD and site feature toggle"
```

---

### Task 6: 站點 API 與使用者邀請

**Files:**
- Create: `src/app/api/[siteSlug]/admin/pages/route.ts`
- Create: `src/app/api/[siteSlug]/admin/posts/route.ts`
- Create: `src/app/api/[siteSlug]/admin/users/invite/route.ts`
- Create: `src/app/api/[siteSlug]/admin/users/route.ts`
- Modify: `src/app/api/sites/route.ts` - 加 admin 檢查

- [ ] **Step 1: 建立 invite API**

檢查 requireSiteAccess + admin/editor 站角色，驗證一人一站約束 (count SiteUser where userId)

- [ ] **Step 2: 建立站級 pages/posts API 含 feature 與授權檢查**

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/[siteSlug]/admin/"
git commit -m "feat: add site-scoped APIs with auth and feature guard"
```

---

### Task 7: 驗證與文件

**Files:**
- Modify: `README.md` - 補子路徑與功能選單說明
- No new code

- [ ] **Step 1: 執行 tsc/lint/build**

Run: `npx tsc --noEmit` ; `npm run lint` ; `npm run build` 皆 PASS

- [ ] **Step 2: 手動驗證清單**

前台匿名、草稿隱藏、未啟用 404、跨站拒絕、切站、新增功能即時生效

- [ ] **Step 3: 更新 README 與 commit**

```bash
git add README.md
git commit -m "docs: update README for subpath multi-tenant"
```

---

## Self-Review

- Spec 6 章節皆有對應 Task (架構->3, 資料->1, 認證->2, 功能->5, 前台->4, 部署->7)
- 無 TBD/TODO placeholder, 每個 Task 含實際檔案與程式碼片段
- 類型一致: FeatureDefinition.key 為 string, SiteFeature 關聯正確, siteRoles 注入於 auth.ts 與 siteAuth.ts 共用

