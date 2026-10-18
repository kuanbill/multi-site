import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { roleLabel } from '@/lib/roles'
import RoleSelect from './RoleSelect'
import DeleteUserButton from './DeleteUserButton'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await getAdminSession()
  if (!session) redirect('/')
  const currentUserId = session.user.id

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      allSites: true,
      createdAt: true,
      sites: {
        select: { role: true, site: { select: { name: true, slug: true } } },
        orderBy: { siteId: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-balance text-2xl font-bold">使用者管理</h2>
        <Link href="/admin/users/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          新增使用者
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">姓名</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">電子郵件</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">角色</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">所屬專案</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">註冊時間</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="max-w-[14rem] break-words px-6 py-4">{user.name}</td>
                <td className="max-w-[18rem] break-all px-6 py-4 text-gray-500">{user.email}</td>
                <td className="px-6 py-4">
                  <RoleSelect
                    id={user.id}
                    currentRole={user.role}
                    disabled={String(user.id) === currentUserId}
                  />
                </td>
                <td className="px-6 py-4">
                  {user.role === 'admin' ? (
                    <span className="text-gray-400 text-sm">—</span>
                  ) : user.allSites && user.role === 'editor' ? (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700">
                      所有子網站（不設限）
                    </span>
                  ) : user.sites.length === 0 ? (
                    <span className="text-gray-400 text-sm">無</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {user.sites.map((membership) => (
                        <span
                          key={membership.site.slug}
                          className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700"
                        >
                          {membership.site.name}
                          <span className="text-blue-400">（{roleLabel(membership.role)}）</span>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">
                    <Link href={`/admin/users/${user.id}/edit`} className="inline-flex min-h-11 items-center text-blue-600 hover:underline">
                      編輯
                    </Link>
                    <DeleteUserButton id={user.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
