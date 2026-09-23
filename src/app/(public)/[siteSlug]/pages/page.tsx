import { prisma } from '@/lib/prisma';
import { requirePublicFeature } from '@/lib/contentAccess';
import { getFeatureDisplayMode } from '@/lib/site';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PublicPagesIndex({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const { site } = await requirePublicFeature(siteSlug, 'pages');
  const pages = await prisma.page.findMany({ where: { siteId: site.id }, orderBy: { createdAt: 'asc' } });
  const displayMode = await getFeatureDisplayMode(site.id, 'pages');
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">頁面</h1>
      {displayMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map((p) => (
            <Link key={p.id} href={`/${siteSlug}/pages/${p.slug}`} className="block border rounded-lg p-4 hover:shadow">
              <h3 className="font-medium text-blue-600">{p.title}</h3>
              <p className="text-sm text-gray-500 mt-1">/{p.slug}</p>
            </Link>
          ))}
        </div>
      ) : displayMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-4">
          {pages.map((p) => (
            <Link key={p.id} href={`/${siteSlug}/pages/${p.slug}`} className="border rounded-lg p-3 text-center hover:shadow">
              <p className="font-medium text-blue-600">{p.title}</p>
            </Link>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {pages.map((p) => (
            <li key={p.id}>
              <Link href={`/${siteSlug}/pages/${p.slug}`} className="text-blue-600 hover:underline">
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
