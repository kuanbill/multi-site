import { prisma } from '@/lib/prisma';
import { requireSiteContext } from '@/lib/contentAccess';
import { mergeSiteFeatures } from '@/lib/features';
import SiteFeatureClient from './SiteFeatureClient';

export const dynamic = 'force-dynamic';

export default async function SiteFeaturesPage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireSiteContext(siteSlug);
  const site = context.site;
  const definitions = await prisma.featureDefinition.findMany({ orderBy: { createdAt: 'asc' } });
  const siteFeatures = await prisma.siteFeature.findMany({ where: { siteId: site.id } });
  const merged = mergeSiteFeatures(
    definitions,
    siteFeatures.map((feature) => ({
      featureId: feature.featureId,
      enabled: feature.enabled,
      sortOrder: feature.sortOrder,
      displayMode: feature.displayMode,
      visibility: feature.visibility === 'members' ? 'members' : 'public',
    })),
  );
  const canChangeVisibility = context.siteRole === 'global-admin' || context.siteRole === 'admin';
  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{site.name} - 功能設定</h2>
      <p className="text-gray-500 mb-6">勾選啟用功能，拖曳或編號調整排序。</p>
      <SiteFeatureClient siteSlug={siteSlug} initial={merged} canChangeVisibility={canChangeVisibility} />
    </div>
  );
}
