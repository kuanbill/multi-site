import { prisma } from '@/lib/prisma';
import { getSiteBySlug } from '@/lib/site';
import HomeSections from '@/components/public/HomeSections';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();

  const [home, sections] = await Promise.all([
    prisma.siteHome.findUnique({
      where: { siteId: site.id },
      include: { heroMedia: { select: { url: true } } },
    }),
    prisma.siteHomeSection.findMany({
      where: { siteId: site.id },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
  ]);

  return (
    <div>
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow mb-6">
        <h1 className="text-3xl font-bold mb-2">{site.name}</h1>
        <p className="text-gray-600">{site.description}</p>
        {home?.tagline && <p className="text-lg text-primary mt-2">{home.tagline}</p>}
        {home?.intro && <p className="text-gray-700 mt-4 whitespace-pre-wrap">{home.intro}</p>}
        {home?.heroMedia?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={home.heroMedia.url} alt={site.name} className="mt-4 w-full max-h-64 object-cover rounded" />
        )}
        {home?.currentStage && (
          <div className="mt-4 p-3 bg-primary/5 rounded">
            <span className="text-sm text-gray-500">目前階段：</span>
            <span className="font-medium">{home.currentStage}</span>
          </div>
        )}
      </div>

      {sections.length > 0 && <HomeSections siteId={site.id} siteSlug={siteSlug} sections={sections} />}

      {(home?.contactName || home?.contactPhone || home?.contactEmail || home?.contactAddress) && (
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="font-bold mb-4">聯絡資訊</h2>
          <ul className="space-y-1 text-sm text-gray-700">
            {home.contactName && <li>聯絡人：{home.contactName}</li>}
            {home.contactPhone && <li>電話：{home.contactPhone}</li>}
            {home.contactEmail && <li>電子郵件：{home.contactEmail}</li>}
            {home.contactAddress && <li>地址：{home.contactAddress}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
