import { prisma } from './prisma';

const siteCache = new Map<string, any>();

export async function getSiteBySlug(slug: string) {
  if (siteCache.has(slug)) return siteCache.get(slug);
  const site = await prisma.site.findUnique({ where: { slug } });
  if (site) siteCache.set(slug, site);
  return site;
}

export async function getEnabledFeatures(siteId: number) {
  const rows = await prisma.siteFeature.findMany({
    where: { siteId, enabled: true },
    include: { feature: true },
    orderBy: { sortOrder: 'asc' },
  });
  return rows.map((r) => r.feature);
}

export async function getSiteFeatures(siteId: number) {
  return getEnabledFeatures(siteId);
}

export async function isFeatureEnabled(siteId: number, featureKey: string) {
  const row = await prisma.siteFeature.findFirst({
    where: { siteId, feature: { key: featureKey } },
  });
  if (!row) return false;
  return row.enabled;
}

export function clearSiteCache(slug?: string) {
  if (slug) siteCache.delete(slug);
  else siteCache.clear();
}
