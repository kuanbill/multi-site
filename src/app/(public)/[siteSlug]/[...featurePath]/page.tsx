import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePublicFeature } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import { getEnabledFeatureByPath, getSiteBySlug } from '@/lib/site';
import { buildYouTubeEmbedUrl, parseYouTubeVideoId } from '@/lib/featureEntryValidation';
import { getFeatureEntryLayoutClass, resolveFeatureEntryRouteSegments } from '@/lib/featureEntryDisplay';

export const dynamic = 'force-dynamic';

export default async function CustomFeaturePage({
  params,
}: {
  params: Promise<{ siteSlug: string; featurePath: string[] }>;
}) {
  const { siteSlug, featurePath: segments } = await params;
  let route: ReturnType<typeof resolveFeatureEntryRouteSegments>;
  try {
    route = resolveFeatureEntryRouteSegments(segments);
  } catch {
    notFound();
  }

  const site = await getSiteBySlug(siteSlug);
  if (!site || site.status === 'archived') notFound();

  const siteFeature = await getEnabledFeatureByPath(site.id, route.featurePath);
  if (!siteFeature) notFound();
  const { feature } = await requirePublicFeature(siteSlug, siteFeature.feature.key);

  if (route.entryId === null) {
    const entries = await prisma.featureEntry.findMany({
      where: { siteId: site.id, featureId: siteFeature.featureId },
      orderBy: { createdAt: 'desc' },
      include: { media: { select: { url: true, altText: true } } },
    });

    return (
      <section>
        <header className="bg-white p-8 rounded-lg shadow mb-6">
          <h1 className="text-2xl font-bold mb-2">{feature.feature.label}</h1>
          {feature.feature.description && <p className="text-gray-600 whitespace-pre-wrap">{feature.feature.description}</p>}
        </header>

        {entries.length === 0 ? (
          <p className="bg-white p-6 rounded-lg shadow text-gray-500">尚無資料</p>
        ) : (
          <div className={getFeatureEntryLayoutClass(feature.displayMode)}>
            {entries.map((entry) => (
              <Link key={entry.id} href={`/${siteSlug}/${route.featurePath}/${entry.id}`} className="block bg-white p-5 rounded-lg shadow hover:shadow-md">
                {entry.contentType === 'image' && entry.media?.url && (
                  <Image src={entry.media.url} alt={entry.media.altText ?? entry.title} width={1200} height={800} unoptimized className="w-full max-h-72 object-contain rounded mb-3" />
                )}
                <h2 className="text-lg font-semibold text-blue-700">{entry.title}</h2>
                {entry.content && <p className="mt-2 text-gray-600 whitespace-pre-wrap line-clamp-3">{entry.content}</p>}
                {entry.contentType === 'youtube' && <span className="mt-2 inline-block text-sm text-gray-500">YouTube 影片</span>}
              </Link>
            ))}
          </div>
        )}
      </section>
    );
  }

  const entry = await prisma.featureEntry.findFirst({
    where: { id: route.entryId, siteId: site.id, featureId: siteFeature.featureId },
    include: { media: { select: { url: true, altText: true } } },
  });
  if (!entry) notFound();

  let youtubeEmbedUrl: string | null = null;
  if (entry.contentType === 'youtube') {
    try {
      youtubeEmbedUrl = buildYouTubeEmbedUrl(parseYouTubeVideoId(entry.youtubeUrl));
    } catch {
      notFound();
    }
  }

  return (
    <article className="bg-white p-8 rounded-lg shadow">
      <Link href={`/${siteSlug}/${route.featurePath}`} className="text-sm text-blue-600 hover:underline">← 返回{feature.feature.label}</Link>
      <h1 className="mt-4 text-2xl font-bold">{entry.title}</h1>
      {entry.contentType === 'youtube' && youtubeEmbedUrl && (
        <div className="mt-6 aspect-video">
          <iframe
            src={youtubeEmbedUrl}
            title={entry.title}
            className="w-full h-full rounded"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      )}
      {entry.contentType === 'image' && entry.media?.url && (
        <Image src={entry.media.url} alt={entry.media.altText ?? entry.title} width={1200} height={800} unoptimized className="mt-6 w-full max-h-[70vh] object-contain rounded" />
      )}
      {entry.content && <p className="mt-6 whitespace-pre-wrap text-gray-700">{entry.content}</p>}
    </article>
  );
}
