import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canManageSiteSettings, requireContentPermission, requireSiteContext } from '@/lib/contentAccess';
import { validateHexColor } from '@/lib/contentValidation';
import { clearSiteCache } from '@/lib/site';

type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const { site } = await requireSiteContext(siteSlug);
  return NextResponse.json({ primaryColor: site.primaryColor, accentColor: site.accentColor });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  if (!canManageSiteSettings(context.siteRole)) {
    return NextResponse.json({ error: '只有站點管理員可修改外觀設定' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }
  const record = body as { primaryColor?: unknown; accentColor?: unknown };

  try {
    const primaryColor = validateHexColor(record.primaryColor, '主色');
    const accentColor = validateHexColor(record.accentColor, '輔色');
    await prisma.site.update({ where: { id: context.site.id }, data: { primaryColor, accentColor } });
    clearSiteCache(siteSlug);
    return NextResponse.json({ message: '已更新' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('色碼')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}
