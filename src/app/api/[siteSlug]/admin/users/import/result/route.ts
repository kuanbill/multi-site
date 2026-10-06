import { NextResponse } from 'next/server';
import { canManageSiteMembers, requireSiteContext } from '@/lib/contentAccess';
import {
  buildResultWorkbookBuffer,
  importResultFromUnknown,
  TEMPLATE_CONTENT_TYPE,
} from '@/lib/memberImport';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const { siteRole } = await requireSiteContext(siteSlug);
  if (!canManageSiteMembers(siteRole)) {
    return NextResponse.json({ error: '僅本站管理員或編輯者可下載匯入結果' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '請求內容無效' }, { status: 400 });
  }

  const result = importResultFromUnknown(body);
  if (!result) return NextResponse.json({ error: '匯入結果格式無效' }, { status: 400 });
  if (result.created.length + result.skipped.length + result.errors.length === 0) {
    return NextResponse.json({ error: '沒有可下載的結果' }, { status: 400 });
  }

  try {
    const buffer = await buildResultWorkbookBuffer(result);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': TEMPLATE_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename="member-import-result.xlsx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: '產生結果檔失敗' }, { status: 500 });
  }
}
