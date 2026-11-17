import { getToken, type JWT } from 'next-auth/jwt';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { resolveFrontendView, trackFrontendView } from '@/lib/activity';

const RESERVED = new Set([
  'login',
  'register',
  'api',
  'sites',
  'admin',
  'users',
  '_next',
  'favicon.ico',
  'common_charge_tool',
  'bardcode',
]);
const SITE_SESSION_COOKIE = 'site-session-token';
const ADMIN_SESSION_COOKIE = 'admin-session-token';

export type ProxyToken = {
  id?: JWT['id'];
  authType?: JWT['authType'];
  role?: JWT['role'];
  siteRoles?: Array<{ slug: string; role: string }>;
} | null;
export type ProxyDecision =
  | { action: 'allow' }
  | { action: 'forbidden' }
  | { action: 'redirect'; location: string };

function isAdminSessionToken(token: ProxyToken): boolean {
  return token?.authType === 'admin' && (token.role === 'admin' || token.role === 'editor');
}

function isGlobalAdminToken(token: ProxyToken): boolean {
  return token?.authType === 'admin' && token.role === 'admin';
}

function isAssignedSiteManager(token: ProxyToken, siteSlug: string): boolean {
  return token?.authType === 'admin' &&
    token.role === 'editor' &&
    Boolean(token.siteRoles?.some((siteRole) => siteRole.slug === siteSlug));
}

function getAdminSiteSlug(pathname: string, prefix: string): string | null {
  const match = pathname.startsWith(prefix) ? pathname.slice(prefix.length).split('/')[0] : '';
  return match || null;
}

function isAdminPage(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function isAdminApi(pathname: string): boolean {
  return pathname.startsWith('/api/admin/');
}

function isSiteAdminApi(pathname: string): boolean {
  return /^\/api\/[^/]+\/admin(?:\/|$)/.test(pathname);
}

function isPublicSiteApi(pathname: string): boolean {
  return /^\/api\/[^/]+\/maps(?:\/|$)/.test(pathname);
}

function getLegacySiteAdminTarget(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)\/admin(?:\/(.*))?$/);
  if (!match || RESERVED.has(match[1])) return null;
  return `/admin/sites/${match[1]}${match[2] ? `/${match[2]}` : ''}`;
}

function isPublicFrontendPath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0 || RESERVED.has(parts[0])) return false;
  return true;
}

export function decideProxyRoute(
  pathname: string,
  adminToken: ProxyToken,
  siteToken: ProxyToken,
): ProxyDecision {
  // Site tokens may access public frontend routes, but never satisfy an admin check.
  void siteToken;

  if (pathname === '/common_charge_tool' || pathname.startsWith('/common_charge_tool/')) {
    return { action: 'allow' };
  }

  if (pathname === '/bardcode' || pathname.startsWith('/bardcode/')) {
    return { action: 'allow' };
  }

  if (pathname === '/login' || pathname === '/register') {
    return { action: 'redirect', location: '/admin/login' };
  }

  if (pathname === '/admin/login' || pathname === '/api/admin/auth' || pathname.startsWith('/api/admin/auth/')) {
    return { action: 'allow' };
  }

  if (pathname === '/api/auth' || pathname.startsWith('/api/auth/')) {
    return { action: 'allow' };
  }

  if (pathname === '/') {
    return isAdminSessionToken(adminToken)
      ? { action: 'redirect', location: '/admin' }
      : { action: 'redirect', location: '/admin/login' };
  }

  if (isAdminApi(pathname)) {
    return isGlobalAdminToken(adminToken) ? { action: 'allow' } : { action: 'forbidden' };
  }

  if (isSiteAdminApi(pathname)) {
    const siteSlug = getAdminSiteSlug(pathname, '/api/');
    return isGlobalAdminToken(adminToken) || (siteSlug ? isAssignedSiteManager(adminToken, siteSlug) : false)
      ? { action: 'allow' }
      : { action: 'forbidden' };
  }

  if (isPublicSiteApi(pathname)) {
    return { action: 'allow' };
  }

  if (isAdminPage(pathname)) {
    if (pathname === '/admin') {
      return isAdminSessionToken(adminToken)
        ? { action: 'allow' }
        : { action: 'redirect', location: '/admin/login' };
    }
    if (isGlobalAdminToken(adminToken)) return { action: 'allow' };
    const siteSlug = getAdminSiteSlug(pathname, '/admin/sites/');
    if (siteSlug && isAssignedSiteManager(adminToken, siteSlug)) return { action: 'allow' };
    return adminToken?.authType === 'admin' ? { action: 'forbidden' } : { action: 'redirect', location: '/admin/login' };
  }

  const legacySiteAdminTarget = getLegacySiteAdminTarget(pathname);
  if (legacySiteAdminTarget) {
    const siteSlug = legacySiteAdminTarget.split('/')[3];
    return isGlobalAdminToken(adminToken) || isAssignedSiteManager(adminToken, siteSlug)
      ? { action: 'redirect', location: legacySiteAdminTarget }
      : adminToken?.authType === 'admin' ? { action: 'forbidden' } : { action: 'redirect', location: '/admin/login' };
  }

  if (pathname === '/sites' || pathname.startsWith('/sites/')) {
    return isGlobalAdminToken(adminToken)
      ? { action: 'redirect', location: pathname.replace(/^\/sites/, '/admin/sites') }
      : { action: 'redirect', location: '/admin/login' };
  }

  if (pathname === '/users' || pathname.startsWith('/users/')) {
    return isGlobalAdminToken(adminToken)
      ? { action: 'redirect', location: pathname.replace(/^\/users/, '/admin/users') }
      : { action: 'redirect', location: '/admin/login' };
  }

  if (isPublicFrontendPath(pathname)) {
    return { action: 'allow' };
  }

  return isAdminSessionToken(adminToken)
    ? { action: 'allow' }
    : { action: 'redirect', location: '/admin/login' };
}

async function readToken(req: NextRequest, cookieName: string): Promise<ProxyToken> {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    return await getToken({ req, secret, cookieName });
  } catch {
    return null;
  }
}

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;
  if (pathname === '/common_charge_tool' || pathname.startsWith('/common_charge_tool/')) {
    return NextResponse.next();
  }
  if (pathname === '/bardcode' || pathname.startsWith('/bardcode/')) {
    return NextResponse.next();
  }
  const [adminToken, siteToken] = await Promise.all([
    readToken(req, ADMIN_SESSION_COOKIE),
    readToken(req, SITE_SESSION_COOKIE),
  ]);
  const decision = decideProxyRoute(pathname, adminToken, siteToken);

  if (decision.action === 'redirect') {
    const url = req.nextUrl.clone();
    url.pathname = decision.location;
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (decision.action === 'forbidden') {
    return NextResponse.json({ error: '只有管理員可以存取此 API' }, { status: 403 });
  }

  const parts = pathname.split('/').filter(Boolean);
  const requestHeaders = new Headers(req.headers);
  if (parts.length > 0 && !RESERVED.has(parts[0])) {
    requestHeaders.set('x-site-slug', parts[0]);
  }
  requestHeaders.set('x-pathname', pathname + req.nextUrl.search);

  const target = resolveFrontendView(pathname);
  if (target) {
    const token = siteToken;
    const parsedId = token?.id ? Number(token.id) : Number.NaN;
    const userId = Number.isFinite(parsedId) ? parsedId : null;
    event.waitUntil(trackFrontendView(target, userId));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
};
