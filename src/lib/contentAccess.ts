import type { FeatureDefinition, Site, SiteFeature } from '@prisma/client';
import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { authOptions } from './auth';
import { resolveSafeCallbackUrl } from './callbackUrl';
import { getSiteBySlug, getSiteFeature } from './site';

export type SiteRole = 'admin' | 'editor' | 'viewer' | 'global-admin';
export type ContentAction = 'read' | 'write' | 'publish' | 'delete';
export type SiteContext = { site: Site; session: Session; siteRole: SiteRole };
export const PUBLISHED_CONTENT_WHERE = { status: 'published' } as const;

/** Merge `publishedWhere` into public content queries so drafts never leak. */
export type PublicFeatureContext = {
  site: Site;
  feature: SiteFeature & { feature: FeatureDefinition };
  publishedWhere: typeof PUBLISHED_CONTENT_WHERE;
};

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
): Promise<PublicFeatureContext> {
  const site = await getSiteBySlug(siteSlug);
  if (!site || site.status === 'archived') notFound();

  const feature = await getSiteFeature(site.id, featureKey);
  if (!feature || !feature.enabled) notFound();

  if (feature.visibility !== 'public') {
    const session = await getServerSession(authOptions);
    const isGlobalAdmin = session?.user.role === 'admin';
    const isSiteMember = Boolean(
      session?.user.siteRoles?.some((role) => role.slug === siteSlug),
    );
    if (!session || (!isGlobalAdmin && !isSiteMember)) {
      // 未登入與已登入非成員一律導向站點登入頁；
      // 非成員（mode=not-member）會在登入頁被自動登出，站點登入驗證也拒絕非成員。
      redirect(
        await buildSiteLoginRedirect(
          siteSlug,
          feature.feature.path || featureKey,
          session ? 'not-member' : 'members-only',
        ),
      );
    }
  }

  return { site, feature, publishedWhere: PUBLISHED_CONTENT_WHERE };
}

async function buildSiteLoginRedirect(
  siteSlug: string,
  featurePath: string,
  mode: 'members-only' | 'not-member',
): Promise<string> {
  const params = new URLSearchParams();
  if (mode === 'members-only') {
    params.set('reason', 'members-only');
  } else {
    params.set('error', 'not-member');
  }
  params.set('callbackUrl', await resolveCallbackPath(siteSlug, featurePath));
  return `/${siteSlug}/login?${params.toString()}`;
}

/** 取得目前請求路徑（由 proxy 注入 x-pathname），不安全時退回功能首頁。 */
async function resolveCallbackPath(siteSlug: string, featurePath: string): Promise<string> {
  const fallback = `/${siteSlug}/${featurePath}`;
  let raw: string | null = null;
  try {
    raw = (await headers()).get('x-pathname');
  } catch {
    raw = null;
  }
  if (!raw) return fallback;
  const safe = resolveSafeCallbackUrl(raw, siteSlug);
  return safe === `/${siteSlug}` ? fallback : safe;
}

export function canPerformContentAction(role: SiteRole, action: ContentAction): boolean {
  if (role === 'global-admin') return true;
  if (action === 'read') return true;
  if (action === 'write' || action === 'publish') return role === 'admin' || role === 'editor';
  return role === 'admin';
}

export function canManageSiteSettings(role: SiteRole): boolean {
  return role === 'global-admin' || role === 'admin';
}

function isSiteRole(value: string): value is Exclude<SiteRole, 'global-admin'> {
  return value === 'admin' || value === 'editor' || value === 'viewer';
}
