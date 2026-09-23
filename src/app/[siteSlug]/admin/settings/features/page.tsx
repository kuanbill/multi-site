import { prisma } from '@/lib/prisma';
import { requireSiteAccess } from '@/lib/siteAuth';
import { getSiteBySlug } from '@/lib/site';
import { notFound } from 'next/navigation';
import SiteFeatureClient from './SiteFeatureClient';

export const dynamic = 'force-dynamic';

export default async function SiteFeaturesPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  await requireSiteAccess(siteSlug);
  const site = await getSiteBySlug(siteSlug);
  if (!site) notFound();
  const definitions = await prisma.featureDefinition.findMany({ orderBy: { createdAt: 'asc' } });
  const siteFeatures = await prisma.siteFeature.findMany({ where: { siteId: site.id } });
  const map = new Map(siteFeatures.map((sf) => [sf.featureId, sf]));
  const merged = definitions.map((def) => ({
    ...def,
    enabled: map.get(def.id)?.enabled ?? false,
    sortOrder: map.get(def.id)?.sortOrder ?? 0,
    displayMode: map.get(def.id)?.displayMode ?? def.displayMode ?? 'list',
  }));
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{site.name} - 功能設定</h2>
      <p className="text-gray-500 mb-6">勾選啟用功能，拖曳或編號調整排序。</p>
      <SiteFeatureClient siteSlug={siteSlug} initial={merged} />
    </div>
  );
}
