import { prisma } from '@/lib/prisma';
import { getSiteBySlug, isFeatureEnabled } from '@/lib/site';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PublicPagesIndex({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();
  if (!(await isFeatureEnabled(site.id, 'pages'))) notFound();
  const pages = await prisma.page.findMany({ where: { siteId: site.id }, orderBy: { createdAt: 'asc' } });
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">頁面</h1>
      <ul className="space-y-2">
        {pages.map((p) => (
          <li key={p.id}>
            <Link href={`/${siteSlug}/pages/${p.slug}`} className="text-blue-600 hover:underline">
              {p.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
