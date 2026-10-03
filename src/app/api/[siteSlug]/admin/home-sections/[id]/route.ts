import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { validateHomeSectionInput } from '@/lib/homeSections';

type RouteContext = { params: Promise<{ siteSlug: string; id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const sectionId = Number.parseInt(id, 10);
  if (!Number.isInteger(sectionId) || sectionId <= 0) {
    return NextResponse.json({ error: '無效的區塊編號' }, { status: 400 });
  }

  const existing = await prisma.siteHomeSection.findFirst({ where: { id: sectionId, siteId: context.site.id } });
  if (!existing) return NextResponse.json({ error: '找不到該區塊' }, { status: 404 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  // PATCH 為部分更新：未帶入的欄位沿用原值，驗證後才寫回。
  const body = (typeof rawBody === 'object' && rawBody !== null ? rawBody : {}) as Record<string, unknown>;
  const merged = { ...existing, ...body };

  // 排序可單獨更新，不需夾帶完整區塊內容。
  if (Object.keys(body).length === 1 && body.sortOrder !== undefined) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      return NextResponse.json({ error: '順序無效' }, { status: 400 });
    }
    const saved = await prisma.siteHomeSection.update({ where: { id: sectionId }, data: { sortOrder } });
    return NextResponse.json(saved);
  }

  let input: ReturnType<typeof validateHomeSectionInput>;
  try {
    input = validateHomeSectionInput(merged);
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

    const saved = await prisma.siteHomeSection.update({
      where: { id: sectionId },
      data: {
        sourceType: input.sourceType,
        featureId: input.featureId,
        filter: input.filter,
        title: input.title,
        limit: input.limit,
        showAll: input.showAll,
      },
    });
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '首頁資料區塊更新失敗' },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const sectionId = Number.parseInt(id, 10);
  if (!Number.isInteger(sectionId) || sectionId <= 0) {
    return NextResponse.json({ error: '無效的區塊編號' }, { status: 400 });
  }

  const existing = await prisma.siteHomeSection.findFirst({ where: { id: sectionId, siteId: context.site.id } });
  if (!existing) return NextResponse.json({ error: '找不到該區塊' }, { status: 404 });

  await prisma.siteHomeSection.delete({ where: { id: sectionId } });
  return NextResponse.json({ message: '已刪除' });
}