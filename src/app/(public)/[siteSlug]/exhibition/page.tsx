import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requirePublicFeature } from '@/lib/contentAccess';

export const dynamic = 'force-dynamic';

export default async function PublicExhibitionListPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const { site } = await requirePublicFeature(siteSlug, 'exhibitions');

  const items = await prisma.exhibition.findMany({
    where: { siteId: site.id, status: 'published' },
    orderBy: [{ sortOrder: 'asc' }, { startDate: 'desc' }],
  });

  return (
    <div>
      <div className="bg-white p-8 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold mb-2">公開展覽</h1>
        <p className="text-gray-500">{site.name} 的展覽資訊、日期與地點</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        {items.length === 0 ? (
          <p className="text-gray-500">尚無展覽</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/${siteSlug}/exhibition/${item.slug}`}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow block"
              >
                <h3 className="font-bold text-lg">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {item.startDate ? new Date(item.startDate).toLocaleDateString('zh-TW') : ''}
                  {item.endDate ? ` - ${new Date(item.endDate).toLocaleDateString('zh-TW')}` : ''}
                  {item.location ? ` | ${item.location}` : ''}
                </p>
                {item.description && <p className="text-sm text-gray-600 mt-2 line-clamp-3">{item.description}</p>}
                <span className="inline-block mt-3 text-sm text-blue-600">查看詳情 →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
