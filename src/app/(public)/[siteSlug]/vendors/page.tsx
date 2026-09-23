import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requirePublicFeature } from '@/lib/contentAccess';

export const dynamic = 'force-dynamic';

export default async function PublicVendorsPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const { site, publishedWhere } = await requirePublicFeature(siteSlug, 'vendors');

  const items = await prisma.vendor.findMany({
    where: { siteId: site.id, ...publishedWhere },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    include: { logoMedia: true },
  });

  return (
    <div>
      <div className="bg-white p-8 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold mb-2">協力廠商</h1>
        <p className="text-gray-500">{site.name} 的協力廠商與服務資訊</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        {items.length === 0 ? (
          <p className="text-gray-500">尚無廠商</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/${siteSlug}/vendors/${item.id}`}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow block"
              >
                {item.logoMedia?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.logoMedia.url} alt={item.name} className="w-full h-32 object-contain bg-gray-50 rounded mb-3" />
                )}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold">{item.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.category}</span>
                </div>
                {item.summary && <p className="text-sm text-gray-600 line-clamp-2">{item.summary}</p>}
                {item.services && <p className="text-xs text-gray-500 mt-2 line-clamp-1">服務：{item.services}</p>}
                <span className="inline-block mt-3 text-sm text-blue-600">查看詳情 →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
