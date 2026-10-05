import { NextResponse } from 'next/server';
import { canAssignSiteAdmin, requireSiteContext } from '@/lib/contentAccess';
import { parseLogType } from '@/lib/logExport';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ siteSlug: string }> };

/** 清除 log 無法復原，僅限站點管理員與全域管理員。 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireSiteContext(siteSlug);
  if (!canAssignSiteAdmin(context.siteRole)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 });
  }

  const type = parseLogType(new URL(request.url).searchParams.get('type'));
  if (!type) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });

  try {
    // 登入紀錄依使用者儲存、不綁站點，屬全站共用資料。
    const result =
      type === 'logins'
        ? await prisma.loginRecord.deleteMany({})
        : await prisma.featureView.deleteMany({ where: { siteId: context.site.id } });
    return NextResponse.json({ cleared: result.count });
  } catch {
    return NextResponse.json({ error: '清除失敗' }, { status: 500 });
  }
}
