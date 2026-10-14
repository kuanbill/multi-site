import { requirePublicFeature } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function PublicSelectionPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const { site, publishedWhere } = await requirePublicFeature(siteSlug, 'selection');
  const items = await prisma.selectionInfo.findMany({
    where: { siteId: site.id, ...publishedWhere },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  if (items.length === 0) {
    return (
      <section className="rounded bg-white p-6 shadow sm:p-8">
        <h1 className="text-2xl font-bold">選配作業</h1>
        <p className="mt-3 text-gray-600">目前尚無已發布資訊</p>
      </section>
    );
  }

  const attachments = await prisma.contentAttachment.findMany({
    where: { siteId: site.id, ownerType: 'selection', ownerId: { in: items.map((item) => item.id) } },
    include: { media: true },
    orderBy: { sortOrder: 'asc' },
  });
  const attachmentsByItem = new Map<number, typeof attachments>();
  for (const attachment of attachments) {
    const current = attachmentsByItem.get(attachment.ownerId) ?? [];
    current.push(attachment);
    attachmentsByItem.set(attachment.ownerId, current);
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">選配作業</h1>
      {items.map((item) => (
        <article key={item.id} className="space-y-4 rounded bg-white p-6 shadow sm:p-8">
          <h2 className="text-xl font-bold">{item.title}</h2>
          {item.applicableStage && <p><strong>適用階段：</strong>{item.applicableStage}</p>}
          {item.description && <p className="whitespace-pre-wrap break-words">{item.description}</p>}
          {item.rules && <section><h3 className="font-semibold">選配規則</h3><p className="whitespace-pre-wrap break-words">{item.rules}</p></section>}
          {item.notice && <section><h3 className="font-semibold">注意事項</h3><p className="whitespace-pre-wrap break-words">{item.notice}</p></section>}
          {item.deadline && <p>截止日期：{item.deadline.toLocaleString('zh-TW')}</p>}
          {item.externalUrl && <p><a className="text-primary underline" href={item.externalUrl} target="_blank" rel="noopener noreferrer">前往選配連結</a></p>}
          {(attachmentsByItem.get(item.id)?.length ?? 0) > 0 && (
            <section className="space-y-3 border-t pt-4">
              <h3 className="font-semibold">相關檔案與圖片</h3>
              <ul className="space-y-3">
                {attachmentsByItem.get(item.id)!.map(({ id, label, media }) => (
                  <li key={id}>
                    {media.type === 'image' ? (
                      <figure className="space-y-1">
                        <a href={media.url} target="_blank" rel="noreferrer" aria-label={`開啟圖片：${media.altText || label || media.filename}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={media.url} alt={media.altText || label || media.filename} className="h-auto max-h-[32rem] max-w-full rounded border object-contain" />
                        </a>
                        {label && <figcaption className="text-sm text-gray-600">{label}</figcaption>}
                      </figure>
                    ) : (
                      <a href={media.url} download className="text-blue-700 underline">下載：{label || media.filename}</a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      ))}
    </section>
  );
}
