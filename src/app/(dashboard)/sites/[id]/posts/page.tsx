import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function SitePostsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const siteId = parseInt(id)

  const [site, posts] = await Promise.all([
    prisma.site.findUnique({ where: { id: siteId } }),
    prisma.post.findMany({
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
          <h2 className="text-2xl font-bold">{site.name} - 文章管理</h2>
          <p className="text-gray-500">管理此子網站的新聞與公告</p>
        </div>
        <Link
          href={`/sites/${siteId}/posts/new`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增文章
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">標題</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">狀態</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">建立時間</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="px-6 py-4">{post.title}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    post.published
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {post.published ? '已發佈' : '草稿'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/sites/${siteId}/posts/${post.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    編輯
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {posts.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            尚無文章
          </div>
        )}
      </div>
    </div>
  )
}
