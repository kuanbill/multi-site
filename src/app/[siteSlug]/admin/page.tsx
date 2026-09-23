import { prisma } from '@/lib/prisma';
import { getSiteBySlug } from '@/lib/site';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SiteDashboardPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();

  const [pageCount, postCount, userCount] = await Promise.all([
    prisma.page.count({ where: { siteId: site.id } }),
    prisma.post.count({ where: { siteId: site.id } }),
    prisma.siteUser.count({ where: { siteId: site.id } }),
  ]);

  const stats = [
    { label: '頁面數量', value: pageCount, icon: '📄' },
    { label: '文章數量', value: postCount, icon: '📝' },
    { label: '成員數量', value: userCount, icon: '👥' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{site.name} - 儀表板</h2>
      <p className="text-gray-500 mb-6">{site.description}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-4">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium mb-4">快速操作</h3>
        <div className="flex gap-4 flex-wrap">
          <Link href={`/${siteSlug}/admin/pages`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            管理頁面
          </Link>
          <Link href={`/${siteSlug}/admin/posts`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            管理文章
          </Link>
          <Link href={`/${siteSlug}/admin/users`} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            成員管理
          </Link>
          <Link href={`/${siteSlug}`} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            預覽前台
          </Link>
        </div>
      </div>
    </div>
  );
}
