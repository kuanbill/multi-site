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