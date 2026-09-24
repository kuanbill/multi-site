import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { canPerformContentAction, requireContentPermission } from '@/lib/contentAccess';
import { resolveFeatureAdminRouteSegments } from '@/lib/featureAdminRoute';
import FeatureEntryForm, { type FeatureEntryFormValue } from './FeatureEntryForm';
import FeatureEntryList from './FeatureEntryList';
import LegacyPagePostManager, { type LegacyContentItem } from './LegacyPagePostManager';

export const dynamic = 'force-dynamic';

export default async function FeatureEntryAdminPage({
  params,
}: {
  params: Promise<{ siteSlug: string; featureRoute: string[] }>;
}) {
  const { siteSlug, featureRoute } = await params;
  let route: ReturnType<typeof resolveFeatureAdminRouteSegments>;
  try {
    route = resolveFeatureAdminRouteSegments(featureRoute);
  } catch {
    notFound();
  }

  const context = await requireContentPermission(siteSlug, route.view === 'list' ? 'read' : 'write');
  const siteFeature = await prisma.siteFeature.findFirst({
    where: { siteId: context.site.id, enabled: true, feature: { path: route.featurePath } },
    include: { feature: true },
  });
  if (!siteFeature) notFound();

  const canWrite = canPerformContentAction(context.siteRole, 'write');
  if (siteFeature.feature.key === 'pages') {
    const records = await prisma.page.findMany({ where: { siteId: context.site.id }, orderBy: { createdAt: 'desc' } });
    const initialEntry = route.view === 'edit'
      ? await prisma.page.findFirst({ where: { id: route.entryId!, siteId: context.site.id } })
      : null;
    if (route.view === 'edit' && !initialEntry) notFound();
    const entries: LegacyContentItem[] = records.map((record) => ({
      id: record.id,
      title: record.title,
      slug: record.slug,
      content: record.content,
      createdAt: record.createdAt.toLocaleDateString('zh-TW'),
    }));
    const initial = initialEntry ? {
      id: initialEntry.id,
      title: initialEntry.title,
      slug: initialEntry.slug,
      content: initialEntry.content,
    } : null;
    return <LegacyPagePostManager key={`pages:${route.view}:${route.entryId ?? ''}`} siteSlug={siteSlug} featureKey="pages" featureLabel={siteFeature.feature.label} entries={entries} canWrite={canWrite} initialView={route.view} initialEntry={initial} />;
  }

  if (siteFeature.feature.key === 'posts') {
    const records = await prisma.post.findMany({ where: { siteId: context.site.id }, orderBy: { createdAt: 'desc' } });
    const initialEntry = route.view === 'edit'
      ? await prisma.post.findFirst({ where: { id: route.entryId!, siteId: context.site.id } })
      : null;
    if (route.view === 'edit' && !initialEntry) notFound();
    const entries: LegacyContentItem[] = records.map((record) => ({
      id: record.id,
      title: record.title,
      slug: record.slug,
      content: record.content,
      createdAt: record.createdAt.toLocaleDateString('zh-TW'),
      published: record.published,
    }));
    const initial = initialEntry ? {
      id: initialEntry.id,
      title: initialEntry.title,
      slug: initialEntry.slug,
      content: initialEntry.content,
      published: initialEntry.published,
    } : null;
    return <LegacyPagePostManager key={`posts:${route.view}:${route.entryId ?? ''}`} siteSlug={siteSlug} featureKey="posts" featureLabel={siteFeature.feature.label} entries={entries} canWrite={canWrite} initialView={route.view} initialEntry={initial} />;
  }

  if (route.view === 'list') {
    const rows = await prisma.featureEntry.findMany({
      where: { siteId: context.site.id, featureId: siteFeature.featureId },
      orderBy: { updatedAt: 'desc' },
      include: { media: { select: { url: true } } },
    });
    const entries = rows.map((entry) => ({
      id: entry.id,
      title: entry.title,
      contentType: entry.contentType,
      updatedAt: entry.updatedAt.toLocaleDateString('zh-TW'),
      mediaUrl: entry.media?.url ?? null,
    }));

    return (
      <FeatureEntryList
        siteSlug={siteSlug}
        featurePath={route.featurePath}
        featureLabel={siteFeature.feature.label}
        entries={entries}
        canWrite={canWrite}
      />
    );
  }

  let initial: FeatureEntryFormValue | null = null;
  if (route.view === 'edit') {
    const entry = await prisma.featureEntry.findFirst({
      where: { id: route.entryId!, siteId: context.site.id, featureId: siteFeature.featureId },
      include: { media: { select: { id: true, url: true } } },
    });
    if (!entry) notFound();
    initial = {
      id: entry.id,
      title: entry.title,
      content: entry.content ?? '',
      contentType: entry.contentType as FeatureEntryFormValue['contentType'],
      youtubeUrl: entry.youtubeUrl ?? '',
      mediaId: entry.mediaId,
      mediaUrl: entry.media?.url ?? null,
    };
  }

  return (
    <section>
      <h2 className="text-2xl font-bold mb-2">{context.site.name} - {siteFeature.feature.label}</h2>
      {siteFeature.feature.description && <p className="text-gray-500 mb-6">{siteFeature.feature.description}</p>}
      <FeatureEntryForm siteSlug={siteSlug} featurePath={route.featurePath} initial={initial} />
    </section>
  );
}
