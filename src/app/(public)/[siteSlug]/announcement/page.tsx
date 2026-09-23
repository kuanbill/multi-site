import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requirePublicFeature } from '@/lib/contentAccess';

export const dynamic = 'force-dynamic';

export default async function PublicAnnouncementListPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const { site } = await requirePublicFeature(siteSlug, 'announcements');

  const items = await prisma.announcement.findMany({
    where: { siteId: site.id, status: 'published' },
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <div>
      <div className="bg-white p-8 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold mb-2">公告欄</h1>
        <p className="text-gray-500">{site.name} 的最新公告與通知</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        {items.length === 0 ? (
          <p className="text-gray-500">尚無公告</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  {item.pinned && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">置頂</span>}
                  {item.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.category}</span>}
                  <span className="text-xs text-gray-400">
                    {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('zh-TW') : ''}
                  </span>
                </div>
                <Link href={`/${siteSlug}/announcement/${item.slug}`} className="font-medium text-blue-600 hover:underline">
                  {item.title}
                </Link>
                {item.summary && <p className="text-sm text-gray-600 mt-1">{item.summary}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
