import { NextResponse } from 'next/server';
import { canPerformContentAction, requireSiteContext } from '@/lib/contentAccess';
import { buildLoginLogCsv, buildViewLogCsv, logExportFilename, parseLogType } from '@/lib/logExport';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  // 匯出屬非破壞性操作，站內編輯者以上即可。
  const context = await requireSiteContext(siteSlug);
  if (!canPerformContentAction(context.siteRole, 'write')) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 });
  }

  const type = parseLogType(new URL(request.url).searchParams.get('type'));
  if (!type) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });

  let csv: string;
  if (type === 'logins') {
    const rows = await prisma.loginRecord.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
    csv = buildLoginLogCsv(rows.map((row) => ({ name: row.user.name, email: row.user.email, createdAt: row.createdAt })));
  } else {
    const [rows, featureDefinitions] = await Promise.all([
      prisma.featureView.findMany({
        where: { siteId: context.site.id },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      prisma.featureDefinition.findMany({ select: { key: true, label: true } }),
    ]);
    const labelByKey = new Map(featureDefinitions.map((item) => [item.key, item.label]));
    csv = buildViewLogCsv(
      rows.map((row) => ({
        user: row.user?.name ?? null,
        featureLabel: labelByKey.get(row.feature) ?? row.feature,
        path: row.path,
        createdAt: row.createdAt,
      })),
    );
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${logExportFilename(type, siteSlug)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
