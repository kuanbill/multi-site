import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

function forbiddenResponse() {
  return NextResponse.json({ error: '只有管理員可以管理頁面' }, { status: 403 })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession()) return forbiddenResponse()
  const { id } = await params
  const pages = await prisma.page.findMany({
    where: { siteId: parseInt(id) },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(pages)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession()) return forbiddenResponse()
  try {
    const { id } = await params
    const { title, slug, content } = await req.json()
    const siteId = parseInt(id)

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
