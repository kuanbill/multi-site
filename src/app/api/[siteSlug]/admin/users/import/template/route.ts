import { NextResponse } from 'next/server';
import { canManageSiteMembers, requireSiteContext } from '@/lib/contentAccess';
import { buildTemplateWorkbookBuffer, TEMPLATE_CONTENT_TYPE } from '@/lib/memberImport';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const { siteRole } = await requireSiteContext(siteSlug);
  if (!canManageSiteMembers(siteRole)) {
    return NextResponse.json({ error: '僅本站管理員或編輯者可下載範本' }, { status: 403 });
  }

  try {
    const buffer = await buildTemplateWorkbookBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': TEMPLATE_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename="members-template.xlsx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: '產生範本失敗' }, { status: 500 });
  }
}
