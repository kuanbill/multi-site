import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RESERVED = new Set(['login', 'register', 'api', 'sites', 'admin', 'users', '_next', 'favicon.ico']);

function isPublicPath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return false; // / is dashboard, needs auth
  const first = parts[0];
  if (RESERVED.has(first)) return false;
  // /{siteSlug}
  if (parts.length === 1) return true;
  // /{siteSlug}/login public
  if (parts[1] === 'login') return true;
  // /{siteSlug}/pages, posts, faq etc public front
  if (parts[1] === 'pages' || parts[1] === 'posts') return true;
  // /{siteSlug}/admin -> not public
  if (parts[1] === 'admin') return false;
  // any other /{siteSlug}/* without admin -> treat as public (future custom features)
  return true;
}

export default withAuth(
  function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const parts = pathname.split('/').filter(Boolean);
    const requestHeaders = new Headers(req.headers);
    if (parts.length > 0) {
      const first = parts[0];
      if (!RESERVED.has(first)) {
        // inject header for downstream use
        requestHeaders.set('x-site-slug', first);
      }
    }
    // 前台守衛用來產生登入回導 callbackUrl 的目前路徑（含 query）
    requestHeaders.set('x-pathname', pathname + req.nextUrl.search);
    return NextResponse.next({ request: { headers: requestHeaders } });
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;
        // always allow auth endpoints
        if (pathname.startsWith('/api/auth')) return true;
        // allow login/register pages
        if (pathname === '/login' || pathname === '/register') return true;
        if (isPublicPath(pathname)) return true;
        // all other routes require token
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|.*\\..*).*)'],
};
