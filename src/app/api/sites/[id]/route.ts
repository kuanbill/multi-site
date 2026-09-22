import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const site = await prisma.site.findUnique({
    where: { id: parseInt(id) }
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr)
    const { name, slug, description } = await req.json()

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.site.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ message: '已刪除' })
  } catch (error) {
    return NextResponse.json(
      { error: '刪除失敗' },
      { status: 500 }
    )
  }
}