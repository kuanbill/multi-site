import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { DEFAULT_HOME_SECTIONS, HOME_SECTION_MAX_COUNT, type HomeSectionSource } from '@/lib/homeSections';

type RouteContext = { params: Promise<{ siteSlug: string }> };

/**
 * 一鍵加入預設區塊（最新公告／目前進度／頁面），用來取代舊版寫死在首頁的三個區塊。
 * 已存在的來源不會重複建立，且不得超過區塊總數上限。
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');

  const existing = await prisma.siteHomeSection.findMany({
    where: { siteId: context.site.id },
    select: { sourceType: true },
  });
  const existingSources = new Set(existing.map((row) => row.sourceType as HomeSectionSource));

  const count = await prisma.siteHomeSection.count({ where: { siteId: context.site.id } });
  const pending = DEFAULT_HOME_SECTIONS.filter((preset) => !existingSources.has(preset.sourceType));
  if (pending.length === 0) return NextResponse.json({ added: 0 });

  if (count + pending.length > HOME_SECTION_MAX_COUNT) {
    return NextResponse.json(
      { error: `加入預設區塊後會超過 ${HOME_SECTION_MAX_COUNT} 個上限，請先移除不需要的區塊` },
      { status: 400 },
    );
  }

  const created = await prisma.siteHomeSection.createMany({
    data: pending.map((preset, index) => ({
      siteId: context.site.id,
      sourceType: preset.sourceType,
      featureId: null,
      filter: preset.filter,
      title: preset.title,
      limit: preset.limit,
      showAll: preset.showAll,
      sortOrder: count + index,
    })),
  });

  return NextResponse.json({ added: created.count }, { status: 201 });
}