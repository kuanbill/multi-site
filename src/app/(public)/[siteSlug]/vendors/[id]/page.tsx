import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requirePublicFeature } from '@/lib/contentAccess';

export const dynamic = 'force-dynamic';

export default async function PublicVendorDetailPage({
  params,
}: {
  params: Promise<{ siteSlug: string; id: string }>;
}) {
  const { siteSlug, id } = await params;
  const { site, publishedWhere } = await requirePublicFeature(siteSlug, 'vendors');

  const vendorId = Number(id);
  if (!Number.isInteger(vendorId) || vendorId < 1) notFound();

  const item = await prisma.vendor.findFirst({
    where: { id: vendorId, siteId: site.id, ...publishedWhere },
    include: { logoMedia: true },
  });
  if (!item) notFound();

  const attachments = await prisma.contentAttachment.findMany({
    where: { siteId: site.id, ownerType: 'vendor', ownerId: item.id },
    include: { media: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div>
      <div className="mb-4">
        <Link href={`/${siteSlug}/vendors`} className="text-sm text-blue-600 hover:underline">
          ← 返回廠商列表
        </Link>
      </div>

      <div className="bg-white p-8 rounded-lg shadow">
        {item.logoMedia?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.logoMedia.url} alt={item.name} className="w-32 h-32 object-contain bg-gray-50 rounded mb-4 border" />
        )}
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold">{item.name}</h1>
          <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.category}</span>
        </div>
        {item.summary && <p className="text-gray-600 mb-4">{item.summary}</p>}
        {item.description && (
          <div className="mb-4">
            <h3 className="font-medium mb-1">介紹</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.description}</p>
          </div>
        )}
        {item.services && (
          <div className="mb-4">
            <h3 className="font-medium mb-1">服務項目</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.services}</p>
          </div>
        )}
        {(item.contactName || item.contactPhone || item.contactEmail) && (
          <div className="bg-gray-50 p-4 rounded mb-4">
            <h3 className="font-medium mb-2">聯絡資訊</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              {item.contactName && <li>聯絡人：{item.contactName}</li>}
              {item.contactPhone && <li>電話：{item.contactPhone}</li>}
              {item.contactEmail && <li>電子郵件：{item.contactEmail}</li>}
            </ul>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium mb-2">契約文件</h3>
            <ul className="space-y-2">
              {attachments.map((att) => (
                <li key={att.id}>
                  <a href={att.media.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {att.media.filename}（{att.media.mimeType}）
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
