import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

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
      createdAt: true
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
    const role = body.role === 'admin' ? 'admin' : body.role === 'editor' ? 'editor' : ''

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: '請填寫所有欄位' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密碼至少需要 6 個字元' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: '此電子郵件已被註冊' }, { status: 409 })
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await hash(password, 12),
        role
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    })

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: '建立使用者失敗' }, { status: 500 })
  }
}
