import { prisma } from '@/lib/prisma';
import { requirePublicFeature } from '@/lib/contentAccess';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PublicPostDetail({
  params,
}: {
  params: Promise<{ siteSlug: string; postSlug: string }>;
}) {
  const { siteSlug, postSlug } = await params;
  const { site } = await requirePublicFeature(siteSlug, 'posts');
  const post = await prisma.post.findFirst({ where: { siteId: site.id, slug: postSlug, published: true } });
  if (!post) notFound();

  return (
    <article className="bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {new Date(post.createdAt).toLocaleDateString('zh-TW')}
      </p>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content || '' }} />
    </article>
  );
}
