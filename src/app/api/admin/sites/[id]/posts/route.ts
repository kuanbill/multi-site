import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'

function forbiddenResponse() {
  return NextResponse.json({ error: '只有管理員可以管理文章' }, { status: 403 })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession()) return forbiddenResponse()
  const { id } = await params
  const posts = await prisma.post.findMany({
    where: { siteId: parseInt(id) },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(posts)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession()) return forbiddenResponse()
  try {
    const { id } = await params
    const { title, slug, content, published } = await req.json()
    const siteId = parseInt(id)

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
