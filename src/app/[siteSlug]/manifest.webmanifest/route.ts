import { NextResponse } from 'next/server';
import { buildSiteManifest } from '@/lib/pwa';
import { getSiteBySlug } from '@/lib/site';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ siteSlug: string }> };

/** 子網站專屬 manifest，安裝後主畫面使用站名、站色，且範圍限縮在本站。 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const site = await getSiteBySlug(siteSlug);
  if (!site || site.status === 'archived') return new NextResponse('Not Found', { status: 404 });

  return NextResponse.json(buildSiteManifest(site), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
