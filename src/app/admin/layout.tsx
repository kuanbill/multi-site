import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/adminAuth'
import AdminSessionProvider from '@/components/auth/AdminSessionProvider'
import AdminShell from '@/components/AdminShell'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  return (
    <AdminSessionProvider session={session}>
      <AdminShell user={session.user}>{children}</AdminShell>
    </AdminSessionProvider>
  )
}
