import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/adminAuth'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import AdminSessionProvider from '@/components/auth/AdminSessionProvider'

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
      <div className="min-h-screen bg-gray-100">
        <Sidebar />
        <div className="ml-64">
          <Header user={session.user} />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AdminSessionProvider>
  )
}
