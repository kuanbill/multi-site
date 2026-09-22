import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import UserForm from '../../UserForm'

export default async function EditUserPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  if (!await getAdminSession()) redirect('/')

  const { id } = await params
  const userId = Number.parseInt(id, 10)
  if (!Number.isInteger(userId)) notFound()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true }
  })
  if (!user) notFound()

  return <UserForm user={user} />
}
