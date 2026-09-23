import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import DeleteButton from './DeleteButton'

export const dynamic = 'force-dynamic'

export default async function SitesPage() {
  const sites = await prisma.site.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { pages: true, posts: true }
      }
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">子網站管理</h2>
        <Link
          href="/sites/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增子網站
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">名稱</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">網址代稱</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">頁面數</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">文章數</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">建立時間</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sites.map((site) => (
              <tr key={site.id}>
                <td className="px-6 py-4">{site.name}</td>
                <td className="px-6 py-4 text-gray-500">{site.slug}</td>
                <td className="px-6 py-4">{site._count.pages}</td>
                <td className="px-6 py-4">{site._count.posts}</td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(site.createdAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/${site.slug}`} className="text-gray-600 hover:underline mr-3">
                    前台
                  </Link>
                  <Link href={`/${site.slug}/admin`} className="text-blue-600 hover:underline mr-3">
                    管理
                  </Link>
                  <Link
                    href={`/sites/${site.id}/edit`}
                    className="text-blue-600 hover:underline mr-4"
                  >
                    編輯
                  </Link>
                  <DeleteButton id={site.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sites.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            尚無子網站，點擊「新增子網站」建立第一個
          </div>
        )}
      </div>
    </div>
  )
}