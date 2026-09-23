import { prisma } from './prisma';
import type { Site } from '@prisma/client';

const siteCache = new Map<string, Site>();

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
  return rows.map((r) => ({
    ...r.feature,
    enabled: r.enabled,
    sortOrder: r.sortOrder,
    visibility: r.visibility,
  }));
}

export function getPublicNavigationFeatures<T extends { enabled: boolean; sortOrder: number }>(features: T[]) {
  return features.filter((feature) => feature.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getSiteFeatures(siteId: number) {
  return prisma.siteFeature.findMany({
    where: { siteId },
    include: { feature: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getSiteFeature(siteId: number, featureKey: string) {
  return prisma.siteFeature.findFirst({
    where: { siteId, feature: { key: featureKey } },
    include: { feature: true },
  });
}

export async function isFeatureEnabled(siteId: number, featureKey: string) {
  const row = await prisma.siteFeature.findFirst({
    where: { siteId, feature: { key: featureKey } },
  });
  if (!row) return false;
  return row.enabled;
}

export async function getFeatureDisplayMode(siteId: number, featureKey: string): Promise<string> {
  const row = await prisma.siteFeature.findFirst({
    where: { siteId, feature: { key: featureKey } },
    include: { feature: true },
  });
  if (!row) return 'list';
  return row.displayMode || row.feature.displayMode || 'list';
}

export function clearSiteCache(slug?: string) {
  if (slug) siteCache.delete(slug);
  else siteCache.clear();
}
