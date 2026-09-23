import { requireSiteContext } from './contentAccess';
import { prisma } from './prisma';

export async function requireSiteAccess(siteSlug: string) {
  const { session } = await requireSiteContext(siteSlug);
  return session;
}

export async function requireFeature(siteId: number, featureKey: string) {
  const feature = await prisma.featureDefinition.findUnique({ where: { key: featureKey } });
  if (!feature) return false;
  const link = await prisma.siteFeature.findUnique({
    where: { siteId_featureId: { siteId, featureId: feature.id } },
  });
  return link?.enabled ?? false;
}

export async function assertSiteMember(siteSlug: string, userId: number) {
  const site = await prisma.site.findUnique({ where: { slug: siteSlug } });
  if (!site) return null;
  const membership = await prisma.siteUser.findFirst({ where: { userId, siteId: site.id } });
  return { site, membership };
}
