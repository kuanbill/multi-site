import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function SitePagesPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const siteId = parseInt(id)

  const [site, pages] = await Promise.all([
    prisma.site.findUnique({ where: { id: siteId } }),
    prisma.page.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' }
    })
  ])

  if (!site) {
    return <div>找不到此子網站</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{site.name} - 頁面管理</h2>
          <p className="text-gray-500">管理此子網站的靜態頁面</p>
        </div>
        <Link
          href={`/sites/${siteId}/pages/new`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增頁面
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">標題</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">網址</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">更新時間</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pages.map((page) => (
              <tr key={page.id}>
                <td className="px-6 py-4">{page.title}</td>
                <td className="px-6 py-4 text-gray-500">/{page.slug}</td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(page.updatedAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/sites/${siteId}/pages/${page.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    編輯
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            尚無頁面
          </div>
        )}
      </div>
    </div>
  )
}
