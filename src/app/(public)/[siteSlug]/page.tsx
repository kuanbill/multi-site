import { prisma } from '@/lib/prisma';
import { getSiteBySlug, getSiteFeature } from '@/lib/site';
import Link from 'next/link';
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

  const [home, announcementFeature, progressFeature, pagesFeature] = await Promise.all([
    prisma.siteHome.findUnique({
      where: { siteId: site.id },
      include: { heroMedia: { select: { url: true } } },
    }),
    getSiteFeature(site.id, 'announcements'),
    getSiteFeature(site.id, 'progress'),
    getSiteFeature(site.id, 'pages'),
  ]);

  const showAnnouncements = Boolean(announcementFeature?.enabled && announcementFeature.visibility === 'public');
  const showProgress = Boolean(progressFeature?.enabled && progressFeature.visibility === 'public');
  const showPages = Boolean(pagesFeature?.enabled && pagesFeature.visibility === 'public');

  const [announcements, currentProgress, pages] = await Promise.all([
    showAnnouncements
      ? prisma.announcement.findMany({
          where: { siteId: site.id, status: 'published' },
          orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
          take: 3,
        })
      : Promise.resolve([]),
    showProgress
      ? prisma.progressItem.findFirst({
          where: { siteId: site.id, status: 'published', progressStatus: 'current' },
          orderBy: { stageDate: 'desc' },
        })
      : Promise.resolve(null),
    showPages
      ? prisma.page.findMany({ where: { siteId: site.id }, orderBy: { createdAt: 'asc' } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="bg-white p-8 rounded-lg shadow mb-6">
        <h1 className="text-3xl font-bold mb-2">{site.name}</h1>
        <p className="text-gray-600">{site.description}</p>
        {home?.tagline && <p className="text-lg text-blue-600 mt-2">{home.tagline}</p>}
        {home?.intro && <p className="text-gray-700 mt-4 whitespace-pre-wrap">{home.intro}</p>}
        {home?.heroMedia?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={home.heroMedia.url} alt={site.name} className="mt-4 max-h-64 object-cover rounded" />
        )}
        {home?.currentStage && (
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <span className="text-sm text-gray-500">目前階段：</span>
            <span className="font-medium">{home.currentStage}</span>
          </div>
        )}
      </div>

      {showProgress && currentProgress && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="font-bold mb-4">目前進度</h2>
          <div className="border-l-2 border-blue-600 pl-4">
            <p className="text-sm text-gray-500">{new Date(currentProgress.stageDate).toLocaleDateString('zh-TW')}</p>
            <p className="font-medium">
              {currentProgress.stageLabel} - {currentProgress.title}
            </p>
            {currentProgress.summary && <p className="text-sm text-gray-600 mt-1">{currentProgress.summary}</p>}
            <Link href={`/${siteSlug}/progress`} className="inline-block mt-2 text-sm text-blue-600 hover:underline">
              查看完整進度 →
            </Link>
          </div>
        </div>
      )}

      {showPages && pages.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="font-bold mb-4">頁面</h2>
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
      )}

      {showAnnouncements && <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="font-bold mb-4">最新公告</h2>
        {announcements.length === 0 ? (
          <p className="text-gray-500">尚無公告</p>
        ) : (
          <ul className="space-y-4">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center gap-2">
                  {announcement.pinned && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">置頂</span>}
                  <Link
                    href={`/${siteSlug}/announcement/${announcement.slug}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {announcement.title}
                  </Link>
                </div>
                <p className="text-sm text-gray-500">
                  {announcement.publishedAt ? new Date(announcement.publishedAt).toLocaleDateString('zh-TW') : ''}
                </p>
                {announcement.summary && <p className="text-sm text-gray-600 mt-1">{announcement.summary}</p>}
              </li>
            ))}
          </ul>
        )}
        <Link href={`/${siteSlug}/announcement`} className="inline-block mt-4 text-sm text-blue-600 hover:underline">
          查看全部公告 →
        </Link>
      </div>}

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
