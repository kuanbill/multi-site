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
  } catch {
    return NextResponse.json(
      { error: '註冊失敗' },
      { status: 500 }
    )
  }
}