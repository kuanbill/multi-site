import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

function parseUserId(id: string) {
  const userId = Number.parseInt(id, 10)
  return Number.isInteger(userId) && userId > 0 ? userId : null
}

function forbiddenResponse() {
  return NextResponse.json({ error: '只有管理員可以管理使用者' }, { status: 403 })
}

async function isLastAdmin(userId: number) {
  const [user, adminCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.user.count({ where: { role: 'admin' } })
  ])
  return user?.role === 'admin' && adminCount <= 1
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession()) return forbiddenResponse()

  const { id } = await params
  const userId = parseUserId(id)
  if (!userId) return NextResponse.json({ error: '無效的使用者編號' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  })

  if (!user) return NextResponse.json({ error: '找不到此使用者' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const { id } = await params
    const userId = parseUserId(id)
    const { role } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: '無效的使用者編號' }, { status: 400 })
    }

    if (session.user.id === String(userId)) {
      return NextResponse.json({ error: '無法修改目前登入帳號的角色' }, { status: 400 })
    }

    if (role === 'editor' && await isLastAdmin(userId)) {
      return NextResponse.json({ error: '無法降低最後一位管理員的權限' }, { status: 400 })
    }

    if (!['admin', 'editor'].includes(role)) {
      return NextResponse.json(
        { error: '無效的角色' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    })

    return NextResponse.json(user)
  } catch {
    return NextResponse.json(
      { error: '更新失敗' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const { id } = await params
    const userId = parseUserId(id)
    if (!userId) {
      return NextResponse.json({ error: '無效的使用者編號' }, { status: 400 })
    }

    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const role = body.role === 'admin' ? 'admin' : body.role === 'editor' ? 'editor' : ''

    if (!name || !email || !role) {
      return NextResponse.json({ error: '姓名、電子郵件和角色為必填' }, { status: 400 })
    }

    if (password && password.length < 6) {
      return NextResponse.json({ error: '密碼至少需要 6 個字元' }, { status: 400 })
    }

    const existingUser = await prisma.user.findFirst({
      where: { email, id: { not: userId } }
    })
    if (existingUser) {
      return NextResponse.json({ error: '此電子郵件已被註冊' }, { status: 409 })
    }

    if (session.user.id === String(userId) && role !== 'admin') {
      return NextResponse.json({ error: '無法降低目前登入帳號的權限' }, { status: 400 })
    }

    if (role === 'editor' && await isLastAdmin(userId)) {
      return NextResponse.json({ error: '無法降低最後一位管理員的權限' }, { status: 400 })
    }

    const data: { name: string; email: string; role: string; password?: string } = {
      name,
      email,
      role
    }
    if (password) data.password = await hash(password, 12)

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    })

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: '更新使用者失敗' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return forbiddenResponse()

  try {
    const { id } = await params
    const userId = parseUserId(id)
    if (!userId) {
      return NextResponse.json({ error: '無效的使用者編號' }, { status: 400 })
    }

    if (session.user.id === String(userId)) {
      return NextResponse.json({ error: '無法刪除目前登入帳號' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    if (!targetUser) {
      return NextResponse.json({ error: '找不到此使用者' }, { status: 404 })
    }

    if (targetUser.role === 'admin' && await isLastAdmin(userId)) {
      return NextResponse.json({ error: '無法刪除最後一位管理員' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.siteUser.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } })
    ])

    return NextResponse.json({ message: '已刪除' })
  } catch {
    return NextResponse.json(
      { error: '刪除失敗' },
      { status: 500 }
    )
  }
}
