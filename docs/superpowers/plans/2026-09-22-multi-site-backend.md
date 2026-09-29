# Multi-Site 都更專案管理後台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個多子站後台管理系統，用於管理多個都更專案子網站的內容與使用者

**Architecture:** Next.js 14+ App Router 全端應用，Prisma ORM 搭配 SQLite 資料庫，Tailwind CSS + shadcn/ui 作為 UI 框架

**Tech Stack:** Next.js 14+, TypeScript, Prisma, SQLite, Tailwind CSS, shadcn/ui, NextAuth.js

**Spec:** docs/superpowers/plans/2026-09-22-multi-site-backend.md (本文件)

---

## 資料模型設計

```
User              Site              SiteUser           Page              Post              Media
─────             ─────             ──────             ────              ────              ─────
id (Int)          id (Int)          id (Int)           id (Int)          id (Int)          id (Int)
email (String)    name (String)     userId (Int)       siteId (Int)      siteId (Int)      siteId (Int)
name (String)     slug (String)     siteId (Int)       title (String)    title (String)    filename (String)
password (Hash)   description(Text) role (String)      slug (String)     slug (String)     url (String)
role (String)     createdAt         createdAt          content(Text)     content(Text)     type (String)
createdAt         updatedAt         updatedAt          createdAt         published(Boolean) createdAt
updatedAt                                                  updatedAt        createdAt         updatedAt
                                                         
                                                    

```

## Global Constraints

- Node.js >= 18
- npm >= 9
- Windows 環境 (C:\multi-site)
- 所有 API 路由使用 /api 前綴
- 使用繁體中文作為介面語言

---

## Task 1: 專案初始化與環境設定

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

- [ ] **Step 1: 初始化 Next.js 專案**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

- [ ] **Step 2: 安裝額外依賴**

```bash
npm install prisma @prisma/client next-auth bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 3: 初始化 Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 4: 驗證專案可啟動**

```bash
npm run dev
```
預期：開啟 http://localhost:3000 看到 Next.js 預設頁面

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize Next.js project with Prisma, Tailwind, and dependencies"
```

---

## Task 2: 資料庫 Schema 設定

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 定義 Prisma Schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  password  String
  role      String   @default("editor") // admin, editor
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sites     SiteUser[]
}

model Site {
  id          Int      @id @default(autoincrement())
  name        String
  slug        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       SiteUser[]
  pages       Page[]
  posts       Post[]
  media       Media[]
}

model SiteUser {
  id        Int      @id @default(autoincrement())
  userId    Int
  siteId    Int
  role      String   @default("editor") // admin, editor, viewer
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  site      Site     @relation(fields: [siteId], references: [id])

  @@unique([userId, siteId])
}

model Page {
  id        Int      @id @default(autoincrement())
  siteId    Int
  title     String
  slug      String
  content   String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  site      Site     @relation(fields: [siteId], references: [id])

  @@unique([siteId, slug])
}

model Post {
  id        Int      @id @default(autoincrement())
  siteId    Int
  title     String
  slug      String
  content   String?
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  site      Site     @relation(fields: [siteId], references: [id])

  @@unique([siteId, slug])
}

model Media {
  id        Int      @id @default(autoincrement())
  siteId    Int
  filename  String
  url       String
  type      String
  createdAt DateTime @default(now())
  site      Site     @relation(fields: [siteId], references: [id])
}
```

- [ ] **Step 2: 執行資料庫遷移**

```bash
npx prisma migrate dev --name init
```

- [ ] **Step 3: 建立 Prisma Client 工具函式**

Create: `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: Commit**

```bash
git add prisma/ src/lib/prisma.ts
git commit -m "feat: add database schema and Prisma client"
```

---

## Task 3: 認證系統 (NextAuth.js)

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/lib/auth.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/middleware.ts`

- [ ] **Step 1: 建立 Auth 配置**

Create: `src/lib/auth.ts`

```typescript
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('請輸入帳號密碼')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          throw new Error('帳號不存在')
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('密碼錯誤')
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}
```

- [ ] **Step 2: 建立 API Route**

Create: `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

- [ ] **Step 3: 建立登入頁面**

Create: `src/app/(auth)/login/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    const result = await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirect: false
    })

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center mb-6">多子站管理系統</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">電子郵件</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">密碼</label>
            <input
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 建立註冊頁面**

Create: `src/app/(auth)/register/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password')
      })
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '註冊失敗')
      setLoading(false)
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-center mb-6">註冊帳號</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">姓名</label>
            <input
              name="name"
              type="text"
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">電子郵件</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">密碼</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '註冊中...' : '註冊'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          已有帳號？{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            登入
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 建立註冊 API**

Create: `src/app/api/auth/register/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '請填寫所有欄位' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '此電子郵件已被註冊' },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(password, 12)

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    })

    return NextResponse.json({ message: '註冊成功' }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: '註冊失敗' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 6: 建立 Middleware 保護路由**

Create: `src/middleware.ts`

```typescript
import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login'
  }
})

export const config = {
  matcher: ['/((?!login|register|api/auth).*)']
}
```

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add authentication with NextAuth.js, login and register pages"
```

---

## Task 4: 管理後台佈局與導航

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/page.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/Header.tsx`

- [ ] **Step 1: 建立 Dashboard 佈局**

Create: `src/app/(dashboard)/layout.tsx`

```tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <div className="ml-64">
        <Header user={session.user} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 建立側邊欄**

Create: `src/components/Sidebar.tsx`

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { href: '/', label: '儀表板', icon: '📊' },
  { href: '/sites', label: '子網站管理', icon: '🌐' },
  { href: '/users', label: '使用者管理', icon: '👥' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">多子站管理系統</h1>
        <p className="text-sm text-gray-400">都更專案管理後台</p>
      </div>
      
      <nav className="p-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              pathname === item.href
                ? 'bg-blue-600'
                : 'hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: 建立頂部導航**

Create: `src/components/Header.tsx`

```tsx
'use client'

import { signOut } from 'next-auth/react'

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">
      <div></div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-gray-500">{user.role === 'admin' ? '管理員' : '編輯者'}</p>
        </div>
        
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          登出
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: 建立儀表板首頁**

Create: `src/app/(dashboard)/page.tsx`

```tsx
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const [siteCount, userCount, postCount] = await Promise.all([
    prisma.site.count(),
    prisma.user.count(),
    prisma.post.count()
  ])

  const stats = [
    { label: '子網站數量', value: siteCount, icon: '🌐' },
    { label: '使用者數量', value: userCount, icon: '👥' },
    { label: '文章數量', value: postCount, icon: '📝' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">儀表板</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-lg shadow"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/ src/components/
git commit -m "feat: add dashboard layout with sidebar and header"
```

---

## Task 5: 子網站管理 CRUD

**Files:**
- Create: `src/app/(dashboard)/sites/page.tsx`
- Create: `src/app/(dashboard)/sites/new/page.tsx`
- Create: `src/app/(dashboard)/sites/[id]/edit/page.tsx`
- Create: `src/app/api/sites/route.ts`
- Create: `src/app/api/sites/[id]/route.ts`

- [ ] **Step 1: 建立子網站列表頁**

Create: `src/app/(dashboard)/sites/page.tsx`

```tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

export default async function SitesPage() {
  const sites = await prisma.site.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { pages: true, posts: true }
      }
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">子網站管理</h2>
        <Link
          href="/sites/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增子網站
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">名稱</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">網址代稱</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">頁面數</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">文章數</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">建立時間</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sites.map((site) => (
              <tr key={site.id}>
                <td className="px-6 py-4">{site.name}</td>
                <td className="px-6 py-4 text-gray-500">{site.slug}</td>
                <td className="px-6 py-4">{site._count.pages}</td>
                <td className="px-6 py-4">{site._count.posts}</td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(site.createdAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/sites/${site.id}/edit`}
                    className="text-blue-600 hover:underline mr-4"
                  >
                    編輯
                  </Link>
                  <DeleteButton id={site.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sites.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            尚無子網站，點擊「新增子網站」建立第一個
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 建立刪除按鈕元件**

Create: `src/app/(dashboard)/sites/DeleteButton.tsx`

```tsx
'use client'

import { useRouter } from 'next/navigation'

export default function DeleteButton({ id }: { id: number }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('確定要刪除此子網站嗎？')) return

    await fetch(`/api/sites/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="text-red-600 hover:underline"
    >
      刪除
    </button>
  )
}
```

- [ ] **Step 3: 建立新增子網站頁面**

Create: `src/app/(dashboard)/sites/new/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewSitePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        slug: formData.get('slug'),
        description: formData.get('description')
      })
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || '建立失敗')
      setLoading(false)
    } else {
      router.push('/sites')
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">新增子網站</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">網站名稱</label>
          <input
            name="name"
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：XX都更案"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">網址代稱 (slug)</label>
          <input
            name="slug"
            required
            pattern="[a-z0-9-]+"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：xx-urban-renewal"
          />
          <p className="text-xs text-gray-500 mt-1">僅允許小寫英文、數字和連字號</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">描述</label>
          <textarea
            name="description"
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '建立中...' : '建立'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: 建立子網站 API**

Create: `src/app/api/sites/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sites = await prisma.site.findMany({
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(sites)
}

export async function POST(req: Request) {
  try {
    const { name, slug, description } = await req.json()

    if (!name || !slug) {
      return NextResponse.json(
        { error: '名稱和網址代稱為必填' },
        { status: 400 }
      )
    }

    const existingSite = await prisma.site.findUnique({
      where: { slug }
    })

    if (existingSite) {
      return NextResponse.json(
        { error: '此網址代稱已被使用' },
        { status: 400 }
      )
    }

    const site = await prisma.site.create({
      data: { name, slug, description }
    })

    return NextResponse.json(site, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: '建立失敗' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 5: 建立單一子網站 API**

Create: `src/app/api/sites/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const site = await prisma.site.findUnique({
    where: { id: parseInt(params.id) }
  })

  if (!site) {
    return NextResponse.json(
      { error: '找不到此子網站' },
      { status: 404 }
    )
  }

  return NextResponse.json(site)
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, slug, description } = await req.json()
    const id = parseInt(params.id)

    const existingSite = await prisma.site.findFirst({
      where: {
        slug,
        id: { not: id }
      }
    })

    if (existingSite) {
      return NextResponse.json(
        { error: '此網址代稱已被使用' },
        { status: 400 }
      )
    }

    const site = await prisma.site.update({
      where: { id },
      data: { name, slug, description }
    })

    return NextResponse.json(site)
  } catch (error) {
    return NextResponse.json(
      { error: '更新失敗' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.site.delete({
      where: { id: parseInt(params.id) }
    })

    return NextResponse.json({ message: '已刪除' })
  } catch (error) {
    return NextResponse.json(
      { error: '刪除失敗' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/sites/ src/app/api/sites/
git commit -m "feat: add sites CRUD with list, create, edit pages and API"
```

---

## Task 6: 使用者管理

**Files:**
- Create: `src/app/(dashboard)/users/page.tsx`
- Create: `src/app/api/users/route.ts`
- Create: `src/app/api/users/[id]/route.ts`

- [ ] **Step 1: 建立使用者列表頁**

Create: `src/app/(dashboard)/users/page.tsx`

```tsx
import { prisma } from '@/lib/prisma'
import ToggleRoleButton from './ToggleRoleButton'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">使用者管理</h2>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">姓名</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">電子郵件</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">角色</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">註冊時間</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4">{user.name}</td>
                <td className="px-6 py-4 text-gray-500">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role === 'admin' ? '管理員' : '編輯者'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4 text-right">
                  <ToggleRoleButton id={user.id} currentRole={user.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 建立角色切換按鈕**

Create: `src/app/(dashboard)/users/ToggleRoleButton.tsx`

```tsx
'use client'

import { useRouter } from 'next/navigation'

export default function ToggleRoleButton({
  id,
  currentRole
}: {
  id: number
  currentRole: string
}) {
  const router = useRouter()

  async function toggleRole() {
    const newRole = currentRole === 'admin' ? 'editor' : 'admin'

    await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    })

    router.refresh()
  }

  return (
    <button
      onClick={toggleRole}
      className="text-blue-600 hover:underline"
    >
      {currentRole === 'admin' ? '改為編輯者' : '升為管理員'}
    </button>
  )
}
```

- [ ] **Step 3: 建立使用者 API**

Create: `src/app/api/users/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(users)
}
```

- [ ] **Step 4: 建立單一使用者 API**

Create: `src/app/api/users/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { role } = await req.json()

    if (!['admin', 'editor'].includes(role)) {
      return NextResponse.json(
        { error: '無效的角色' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: parseInt(params.id) },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    })

    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json(
      { error: '更新失敗' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.user.delete({
      where: { id: parseInt(params.id) }
    })

    return NextResponse.json({ message: '已刪除' })
  } catch (error) {
    return NextResponse.json(
      { error: '刪除失敗' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/users/ src/app/api/users/
git commit -m "feat: add user management with list and role toggle"
```

---

## Task 7: 內容管理 (頁面與文章)

**Files:**
- Create: `src/app/(dashboard)/sites/[id]/pages/page.tsx`
- Create: `src/app/(dashboard)/sites/[id]/posts/page.tsx`
- Create: `src/app/api/sites/[id]/pages/route.ts`
- Create: `src/app/api/sites/[id]/posts/route.ts`

- [ ] **Step 1: 建立子網站頁面管理**

Create: `src/app/(dashboard)/sites/[id]/pages/page.tsx`

```tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function SitePagesPage({
  params
}: {
  params: { id: string }
}) {
  const siteId = parseInt(params.id)

  const [site, pages] = await Promise.all([
    prisma.site.findUnique({ where: { id: siteId } }),
    prisma.page.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' }
    })
  ])

  if (!site) {
    return <div>找不到此子網站</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{site.name} - 頁面管理</h2>
          <p className="text-gray-500">管理此子網站的靜態頁面</p>
        </div>
        <Link
          href={`/sites/${siteId}/pages/new`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增頁面
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">標題</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">網址</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">更新時間</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pages.map((page) => (
              <tr key={page.id}>
                <td className="px-6 py-4">{page.title}</td>
                <td className="px-6 py-4 text-gray-500">/{page.slug}</td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(page.updatedAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/sites/${siteId}/pages/${page.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    編輯
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            尚無頁面
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 建立頁面 API**

Create: `src/app/api/sites/[id]/pages/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const pages = await prisma.page.findMany({
    where: { siteId: parseInt(params.id) },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(pages)
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { title, slug, content } = await req.json()
    const siteId = parseInt(params.id)

    if (!title || !slug) {
      return NextResponse.json(
        { error: '標題和網址代稱為必填' },
        { status: 400 }
      )
    }

    const existingPage = await prisma.page.findFirst({
      where: { siteId, slug }
    })

    if (existingPage) {
      return NextResponse.json(
        { error: '此網址代稱已被使用' },
        { status: 400 }
      )
    }

    const page = await prisma.page.create({
      data: { siteId, title, slug, content }
    })

    return NextResponse.json(page, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: '建立失敗' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: 建立文章管理頁面**

Create: `src/app/(dashboard)/sites/[id]/posts/page.tsx`

```tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function SitePostsPage({
  params
}: {
  params: { id: string }
}) {
  const siteId = parseInt(params.id)

  const [site, posts] = await Promise.all([
    prisma.site.findUnique({ where: { id: siteId } }),
    prisma.post.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' }
    })
  ])

  if (!site) {
    return <div>找不到此子網站</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{site.name} - 文章管理</h2>
          <p className="text-gray-500">管理此子網站的新聞與公告</p>
        </div>
        <Link
          href={`/sites/${siteId}/posts/new`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增文章
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">標題</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">狀態</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">建立時間</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="px-6 py-4">{post.title}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    post.published
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {post.published ? '已發佈' : '草稿'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/sites/${siteId}/posts/${post.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    編輯
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {posts.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            尚無文章
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 建立文章 API**

Create: `src/app/api/sites/[id]/posts/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const posts = await prisma.post.findMany({
    where: { siteId: parseInt(params.id) },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(posts)
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { title, slug, content, published } = await req.json()
    const siteId = parseInt(params.id)

    if (!title || !slug) {
      return NextResponse.json(
        { error: '標題和網址代稱為必填' },
        { status: 400 }
      )
    }

    const existingPost = await prisma.post.findFirst({
      where: { siteId, slug }
    })

    if (existingPost) {
      return NextResponse.json(
        { error: '此網址代稱已被使用' },
        { status: 400 }
      )
    }

    const post = await prisma.post.create({
      data: { siteId, title, slug, content, published }
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: '建立失敗' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/sites/ src/app/api/sites/
git commit -m "feat: add pages and posts management for each site"
```

---

## Task 8: 種子資料與測試帳號

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: 建立種子資料腳本**

Create: `prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 建立管理員帳號
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: '管理員',
      password: adminPassword,
      role: 'admin'
    }
  })

  // 建立編輯者帳號
  const editorPassword = await hash('editor123', 12)
  const editor = await prisma.user.upsert({
    where: { email: 'editor@example.com' },
    update: {},
    create: {
      email: 'editor@example.com',
      name: '編輯者',
      password: editorPassword,
      role: 'editor'
    }
  })

  // 建立範例子網站
  const site1 = await prisma.site.upsert({
    where: { slug: 'zhonghe-renewal' },
    update: {},
    create: {
      name: '中和都更案',
      slug: 'zhonghe-renewal',
      description: '新北市中和區都市更新計畫'
    }
  })

  const site2 = await prisma.site.upsert({
    where: { slug: 'banqiao-renewal' },
    update: {},
    create: {
      name: '板橋都更案',
      slug: 'banqiao-renewal',
      description: '新北市板橋區都市更新計畫'
    }
  })

  // 建立關聯
  await prisma.siteUser.createMany({
    data: [
      { userId: admin.id, siteId: site1.id, role: 'admin' },
      { userId: admin.id, siteId: site2.id, role: 'admin' },
      { userId: editor.id, siteId: site1.id, role: 'editor' }
    ],
    skipDuplicates: true
  })

  // 建立範例頁面
  await prisma.page.createMany({
    data: [
      { siteId: site1.id, title: '首頁', slug: 'home', content: '<h1>歡迎來到中和都更案</h1>' },
      { siteId: site1.id, title: '關於我們', slug: 'about', content: '<h1>關於中和都更案</h1>' },
      { siteId: site2.id, title: '首頁', slug: 'home', content: '<h1>歡迎來到板橋都更案</h1>' }
    ],
    skipDuplicates: true
  })

  // 建立範例文章
  await prisma.post.createMany({
    data: [
      { siteId: site1.id, title: '都更進度報告', slug: 'progress-report', content: '<p>本月進度順利</p>', published: true },
      { siteId: site1.id, title: '居民說明會', slug: 'community-meeting', content: '<p>將於下週舉辦</p>', published: false },
      { siteId: site2.id, title: '動工典禮', slug: 'groundbreaking', content: '<p>正式動工</p>', published: true }
    ],
    skipDuplicates: true
  })

  console.log('種子資料建立完成！')
  console.log('管理員帳號: admin@example.com / admin123')
  console.log('編輯者帳號: editor@example.com / editor123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 2: 更新 package.json 加入 seed script**

Modify `package.json` 加入：

```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

- [ ] **Step 3: 安裝 ts-node 並執行 seed**

```bash
npm install -D ts-node
npx prisma db seed
```

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add seed data with test accounts and sample sites"
```

---

## Task 9: 整合測試與驗證

- [ ] **Step 1: 啟動開發伺服器**

```bash
npm run dev
```

- [ ] **Step 2: 測試登入功能**

瀏覽器開啟 http://localhost:3000/login
使用 admin@example.com / admin123 登入

- [ ] **Step 3: 測試子網站 CRUD**

- 建立新子網站
- 編輯子網站
- 刪除子網站

- [ ] **Step 4: 測試使用者管理**

- 查看使用者列表
- 切換使用者角色

- [ ] **Step 5: 測試內容管理**

- 建立頁面
- 建立文章
- 發佈/取消發佈文章

- [ ] **Step 6: 執行 build 確認無錯誤**

```bash
npm run build
```

- [ ] **Step 7: 最終 Commit**

```bash
git add .
git commit -m "chore: verify all features working, update README"
```

---

## 後續可擴展功能

1. **媒體上傳** - 圖片與檔案管理
2. **子網站權限** - 針對不同子網站設定不同使用者權限
3. **版本控制** - 頁面與文章的版本歷史
4. **前台預覽** - 子網站前台預覽功能
5. **多語言** - 支援繁體中文/英文切換
6. **API 開放** - 提供子網站內容 API 給前台使用
