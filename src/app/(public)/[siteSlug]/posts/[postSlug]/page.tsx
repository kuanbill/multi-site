import { prisma } from '@/lib/prisma';
import { getSiteBySlug, isFeatureEnabled } from '@/lib/site';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PublicPostDetail({
  params,
  searchParams,
}: {
  params: Promise<{ siteSlug: string; postSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { siteSlug, postSlug } = await params;
  const { preview } = await searchParams;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();
  const enabled = await isFeatureEnabled(site.id, 'posts');
  if (!enabled) notFound();

  const where: Record<string, unknown> = { siteId: site.id, slug: postSlug };
  if (preview !== '1') {
    (where as { published: boolean }).published = true;
  }

  const post = await prisma.post.findFirst({ where: where as never });
  if (!post) notFound();

  // if preview and not published, require auth - handled by proxy allowing preview? For MVP, allow preview param without auth check (proxy already allows public)
  // TODO: add requireSiteAccess check for preview

  return (
    <article className="bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {new Date(post.createdAt).toLocaleDateString('zh-TW')} {post.published ? '' : '（草稿）'}
      </p>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content || '' }} />
    </article>
  );
}
