import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import { roleLabel } from '@/lib/roles'
import RoleSelect from './RoleSelect'
import DeleteUserButton from './DeleteUserButton'
import { buildUserWhere, normalizeUserFilters, type SearchParamValue } from './userSearch'

export const dynamic = 'force-dynamic'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchParamValue>>
}) {
  const session = await getAdminSession()
  if (!session) redirect('/')
  const currentUserId = session.user.id
  const query = await searchParams
  const sites = await prisma.site.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  const filters = normalizeUserFilters(query, sites)

  const users = await prisma.user.findMany({
    where: buildUserWhere(filters),
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

      <form method="GET" className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="user-search" className="mb-1 block text-sm font-medium text-gray-700">搜尋</label>
            <input
              id="user-search"
              name="q"
              defaultValue={filters.q}
              placeholder="搜尋姓名、Email 或專案名稱"
              className="min-h-11 w-full rounded-lg border px-3 py-2 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            />
          </div>
          <div className="min-w-0 md:w-64">
            <label htmlFor="user-site" className="mb-1 block text-sm font-medium text-gray-700">所屬專案</label>
            <select
              id="user-site"
              name="site"
              defaultValue={filters.siteId?.toString() ?? ''}
              className="min-h-11 w-full rounded-lg border px-3 py-2 text-base sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <option value="">全部專案</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="inline-flex min-h-11 items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              搜尋
            </button>
            {(filters.q || filters.siteId !== null) && (
              <Link href="/admin/users" className="inline-flex min-h-11 items-center text-gray-600 hover:underline">
                清除
              </Link>
            )}
          </div>
        </div>
      </form>

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
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">找不到符合條件的使用者</td>
              </tr>
            ) : users.map((user) => (
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
