import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import UserForm from '../UserForm'

export default async function NewUserPage() {
  if (!await getAdminSession()) redirect('/')

  const sites = await prisma.site.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  return <UserForm sites={sites} />
}
