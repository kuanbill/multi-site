import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { HOME_SECTION_MAX_COUNT, validateHomeSectionInput } from '@/lib/homeSections';

type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const sections = await prisma.siteHomeSection.findMany({
    where: { siteId: context.site.id },
    include: { feature: { select: { id: true, key: true, path: true, label: true } } },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json(sections);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  let input: ReturnType<typeof validateHomeSectionInput>;
  try {
    input = validateHomeSectionInput(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  try {
    if (input.sourceType === 'feature' && input.featureId !== null) {
      const siteFeature = await prisma.siteFeature.findFirst({
        where: { siteId: context.site.id, featureId: input.featureId, enabled: true },
      });
      if (!siteFeature) {
        return NextResponse.json({ error: '找不到本站已啟用的功能項' }, { status: 400 });
      }
    }

    const count = await prisma.siteHomeSection.count({ where: { siteId: context.site.id } });
    if (count >= HOME_SECTION_MAX_COUNT) {
      return NextResponse.json({ error: `首頁資料區塊最多 ${HOME_SECTION_MAX_COUNT} 個` }, { status: 400 });
    }

    const saved = await prisma.siteHomeSection.create({
      data: {
        siteId: context.site.id,
        sourceType: input.sourceType,
        featureId: input.featureId,
        filter: input.filter,
        title: input.title,
        limit: input.limit,
        showAll: input.showAll,
        sortOrder: count,
      },
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '首頁資料區塊建立失敗' },
      { status: 500 },
    );
  }
}