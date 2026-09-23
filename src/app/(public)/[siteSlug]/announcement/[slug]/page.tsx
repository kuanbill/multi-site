import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requirePublicFeature } from '@/lib/contentAccess';

export const dynamic = 'force-dynamic';

export default async function PublicAnnouncementDetailPage({
  params,
}: {
  params: Promise<{ siteSlug: string; slug: string }>;
}) {
  const { siteSlug, slug } = await params;
  const { site } = await requirePublicFeature(siteSlug, 'announcements');

  const item = await prisma.announcement.findFirst({
    where: { siteId: site.id, slug, status: 'published' },
  });
  if (!item) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link href={`/${siteSlug}/announcement`} className="text-sm text-blue-600 hover:underline">
          ← 返回公告列表
        </Link>
      </div>

      <article className="bg-white p-8 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-2">
          {item.pinned && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">置頂</span>}
          {item.category && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.category}</span>}
          <span className="text-sm text-gray-500">
            {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('zh-TW') : ''}
          </span>
        </div>
        <h1 className="text-3xl font-bold mb-4">{item.title}</h1>
        {item.summary && <p className="text-gray-600 mb-6">{item.summary}</p>}
        {item.content ? (
          <div className="prose max-w-none whitespace-pre-wrap">{item.content}</div>
        ) : (
          <p className="text-gray-500">無詳細內容</p>
        )}
      </article>
    </div>
  );
}
