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

  const [user, sites] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        allSites: true,
        sites: {
          select: { siteId: true, role: true },
          orderBy: { siteId: 'asc' }
        }
      }
    }),
    prisma.site.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })
  ])
  if (!user) notFound()

  const membership = user.sites[0] ?? null

  return (
    <UserForm
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      sites={sites}
      initialSite={{
        siteId: membership?.siteId ?? null,
        siteRole: membership?.role ?? 'editor'
      }}
      initialAllSites={user.allSites}
    />
  )
}
