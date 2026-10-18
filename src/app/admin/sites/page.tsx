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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-balance text-2xl font-bold">子網站管理</h2>
        <Link
          href="/admin/sites/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          新增子網站
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full">
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
                <td className="max-w-[14rem] break-words px-6 py-4">{site.name}</td>
                <td className="max-w-[14rem] break-all px-6 py-4 text-gray-500">{site.slug}</td>
                <td className="px-6 py-4">{site._count.pages}</td>
                <td className="px-6 py-4">{site._count.posts}</td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(site.createdAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">
                  <Link href={`/${site.slug}`} className="inline-flex min-h-11 items-center text-gray-600 hover:underline">
                    前台
                  </Link>
                  <Link href={`/admin/sites/${site.slug}`} className="inline-flex min-h-11 items-center text-blue-600 hover:underline">
                    管理
                  </Link>
                  <Link
                    href={`/admin/sites/${site.id}/edit`}
                    className="inline-flex min-h-11 items-center text-blue-600 hover:underline"
                  >
                    編輯
                  </Link>
                  <DeleteButton id={site.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {sites.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            尚無子網站，點擊「新增子網站」建立第一個
          </div>
        )}
      </div>
    </div>
  )
}
