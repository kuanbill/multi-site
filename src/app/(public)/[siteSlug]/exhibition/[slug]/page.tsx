import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requirePublicFeature } from '@/lib/contentAccess';

export const dynamic = 'force-dynamic';

export default async function PublicExhibitionDetailPage({
  params,
}: {
  params: Promise<{ siteSlug: string; slug: string }>;
}) {
  const { siteSlug, slug } = await params;
  const { site } = await requirePublicFeature(siteSlug, 'exhibitions');

  const item = await prisma.exhibition.findFirst({
    where: { siteId: site.id, slug, status: 'published' },
  });
  if (!item) notFound();

  const attachments = await prisma.contentAttachment.findMany({
    where: { siteId: site.id, ownerType: 'exhibition', ownerId: item.id },
    include: { media: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div>
      <div className="mb-4">
        <Link href={`/${siteSlug}/exhibition`} className="text-sm text-blue-600 hover:underline">
          ← 返回展覽列表
        </Link>
      </div>

      <article className="bg-white p-8 rounded-lg shadow">
        <div className="text-sm text-gray-500 mb-2">
          {item.startDate ? new Date(item.startDate).toLocaleDateString('zh-TW') : ''}
          {item.endDate ? ` - ${new Date(item.endDate).toLocaleDateString('zh-TW')}` : ''}
          {item.location ? ` | 地點：${item.location}` : ''}
        </div>
        <h1 className="text-3xl font-bold mb-4">{item.title}</h1>
        {item.description && <p className="text-gray-700 whitespace-pre-wrap mb-6">{item.description}</p>}
        {item.feedbackSummary && (
          <div className="bg-blue-50 p-4 rounded mb-6">
            <h3 className="font-medium mb-1">意見回饋摘要</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.feedbackSummary}</p>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium mb-3">展覽圖庫</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {attachments.map((att) => (
                <div key={att.id} className="border rounded overflow-hidden">
                  {att.media.type === 'image' || att.media.mimeType?.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={att.media.url} alt={att.media.altText || item.title} className="w-full h-48 object-cover" />
                  ) : (
                    <a href={att.media.url} target="_blank" rel="noopener noreferrer" className="block p-4 text-sm text-blue-600 hover:underline">
                      {att.media.filename}（{att.media.mimeType}）
                    </a>
                  )}
                  <p className="text-xs text-gray-500 p-2 truncate">{att.media.filename}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
