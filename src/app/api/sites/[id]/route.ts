import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clearSiteCache } from '@/lib/site'

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

    const currentSite = await prisma.site.findUnique({ where: { id } })
    if (!currentSite) {
      return NextResponse.json(
        { error: '找不到此子網站' },
        { status: 404 }
      )
    }

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
    clearSiteCache(currentSite.slug)
    if (site.slug !== currentSite.slug) clearSiteCache(site.slug)

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
    const siteId = parseInt(id)
    const site = await prisma.site.findUnique({ where: { id: siteId } })
    await prisma.site.delete({
      where: { id: siteId }
    })
    if (site) clearSiteCache(site.slug)

    return NextResponse.json({ message: '已刪除' })
  } catch (error) {
    return NextResponse.json(
      { error: '刪除失敗' },
      { status: 500 }
    )
  }
}