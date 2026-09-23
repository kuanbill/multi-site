import type { FeatureDefinition, Site, SiteFeature } from '@prisma/client';
import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';
import { authOptions } from './auth';
import { getSiteBySlug, getSiteFeature } from './site';

export type SiteRole = 'admin' | 'editor' | 'viewer' | 'global-admin';
export type ContentAction = 'read' | 'write' | 'publish' | 'delete';
export type SiteContext = { site: Site; session: Session; siteRole: SiteRole };

export async function requireSiteContext(siteSlug: string): Promise<SiteContext> {
  const site = await getSiteBySlug(siteSlug);
  if (!site || site.status === 'archived') notFound();

  const session = await getServerSession(authOptions);
  if (!session) redirect(`/${siteSlug}/login`);

  if (session.user.role === 'admin') {
    return { site, session, siteRole: 'global-admin' };
  }

  const membership = session.user.siteRoles?.find((role) => role.slug === siteSlug);
  if (!membership || !isSiteRole(membership.role)) redirect('/403');
  return { site, session, siteRole: membership.role };
}

export async function requireContentPermission(
  siteSlug: string,
  action: ContentAction,
): Promise<SiteContext> {
  const context = await requireSiteContext(siteSlug);
  if (!canPerformContentAction(context.siteRole, action)) redirect('/403');
  return context;
}

export async function requirePublicFeature(
  siteSlug: string,
  featureKey: string,
): Promise<{ site: Site; feature: SiteFeature & { feature: FeatureDefinition } }> {
  const site = await getSiteBySlug(siteSlug);
  if (!site || site.status === 'archived') notFound();

  const feature = await getSiteFeature(site.id, featureKey);
  if (!feature || !feature.enabled) notFound();

  if (feature.visibility !== 'public') {
    const session = await getServerSession(authOptions);
    if (!session) redirect(`/${siteSlug}/login`);
    const isGlobalAdmin = session.user.role === 'admin';
    const isSiteMember = session.user.siteRoles?.some((role) => role.slug === siteSlug);
    if (!isGlobalAdmin && !isSiteMember) redirect('/403');
  }

  return { site, feature };
}

export function canPerformContentAction(role: SiteRole, action: ContentAction): boolean {
  if (role === 'global-admin') return true;
  if (action === 'read') return true;
  if (action === 'write' || action === 'publish') return role === 'admin' || role === 'editor';
  return role === 'admin';
}

function isSiteRole(value: string): value is Exclude<SiteRole, 'global-admin'> {
  return value === 'admin' || value === 'editor' || value === 'viewer';
}
