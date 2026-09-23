import { prisma } from '@/lib/prisma';
import { requirePublicFeature } from '@/lib/contentAccess';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PublicPageDetail({
  params,
}: {
  params: Promise<{ siteSlug: string; pageSlug: string }>;
}) {
  const { siteSlug, pageSlug } = await params;
  const { site } = await requirePublicFeature(siteSlug, 'pages');
  const page = await prisma.page.findFirst({
    where: { siteId: site.id, slug: pageSlug },
  });
  if (!page) notFound();

  return (
    <article className="bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">{page.title}</h1>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: page.content || '' }} />
    </article>
  );
}
