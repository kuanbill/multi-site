import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { isRoleValue } from '@/lib/roles'

export async function GET() {
  if (!await getAdminSession()) {
    return NextResponse.json({ error: '只有管理員可以管理使用者' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      sites: {
        select: { role: true, site: { select: { name: true, slug: true } } },
        orderBy: { siteId: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  if (!await getAdminSession()) {
    return NextResponse.json({ error: '只有管理員可以管理使用者' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const role = isRoleValue(body.role) ? body.role : ''

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: '請填寫所有欄位' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密碼至少需要 6 個字元' }, { status: 400 })
    }

    const siteRole = isRoleValue(body.siteRole) ? body.siteRole : 'editor'
    let siteId: number | null = null
    if (body.siteId !== null && body.siteId !== undefined && body.siteId !== '') {
      const parsed = Number(body.siteId)
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json({ error: '無效的子網站' }, { status: 400 })
      }
      siteId = parsed
    }

    if (role !== 'admin' && siteId) {
      const site = await prisma.site.findUnique({ where: { id: siteId } })
      if (!site) return NextResponse.json({ error: '找不到子網站' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: '此電子郵件已被註冊' }, { status: 409 })
    }

    const passwordHash = await hash(password, 12)
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, password: passwordHash, role },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
      })
      if (role !== 'admin' && siteId) {
        await tx.siteUser.create({ data: { userId: created.id, siteId, role: siteRole } })
      }
      return created
    })

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: '建立使用者失敗' }, { status: 500 })
  }
}
