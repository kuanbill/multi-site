import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/auth'
import ToggleRoleButton from './ToggleRoleButton'
import DeleteUserButton from './DeleteUserButton'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  if (!await getAdminSession()) redirect('/')

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
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
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role === 'admin' ? '管理員' : '編輯者'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end items-center gap-4">
                    <Link href={`/users/${user.id}/edit`} className="text-blue-600 hover:underline">
                      編輯
                    </Link>
                    <ToggleRoleButton id={user.id} currentRole={user.role} />
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
