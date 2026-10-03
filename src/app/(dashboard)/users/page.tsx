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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">使用者管理</h2>
        <Link href="/users/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          新增使用者
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
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
                <td className="px-6 py-4">{user.name}</td>
                <td className="px-6 py-4 text-gray-500">{user.email}</td>
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
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end items-center gap-4">
                    <Link href={`/users/${user.id}/edit`} className="text-blue-600 hover:underline">
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
  )
}
