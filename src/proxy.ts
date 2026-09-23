import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

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
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const first = parts[0];
      if (!RESERVED.has(first)) {
        // inject header for downstream use
        req.headers.set('x-site-slug', first);
      }
    }
    return NextResponse.next();
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
