import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { role } = await req.json()

    if (!['admin', 'editor'].includes(role)) {
      return NextResponse.json(
        { error: '無效的角色' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.user.delete({
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
