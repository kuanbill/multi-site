import { NextResponse } from 'next/server';
import { requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import { validateFeatureEntryInput } from '@/lib/featureEntryValidation';

type RouteContext = { params: Promise<{ siteSlug: string; featurePath: string; entryId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug, featurePath, entryId: rawEntryId } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const siteFeature = await findEnabledFeature(context.site.id, featurePath);
  if (!siteFeature) return NextResponse.json({ error: '找不到已啟用的功能' }, { status: 404 });

  const entry = await findEntry(context.site.id, siteFeature.featureId, rawEntryId);
  if (!entry) return NextResponse.json({ error: '找不到功能資料' }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug, featurePath, entryId: rawEntryId } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const siteFeature = await findEnabledFeature(context.site.id, featurePath);
  if (!siteFeature) return NextResponse.json({ error: '找不到已啟用的功能' }, { status: 404 });

  const entry = await findEntry(context.site.id, siteFeature.featureId, rawEntryId);
  if (!entry) return NextResponse.json({ error: '找不到功能資料' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });

  let input: ReturnType<typeof validateFeatureEntryInput>;
  try {
    input = validateFeatureEntryInput({
      title: entry.title,
      content: entry.content,
      contentType: entry.contentType,
      youtubeUrl: entry.youtubeUrl,
      mediaId: entry.mediaId,
      ...body,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  if (input.mediaId !== null) {
    const media = await prisma.media.findFirst({
      where: { id: input.mediaId, siteId: context.site.id },
      select: { id: true },
    });
    if (!media) return NextResponse.json({ error: '找不到本站圖片媒體' }, { status: 400 });
  }

  try {
    const updated = await prisma.featureEntry.update({
      where: { id: entry.id },
      data: input,
      include: { media: { select: { id: true, url: true, altText: true } } },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: '更新功能資料失敗' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, featurePath, entryId: rawEntryId } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const siteFeature = await findEnabledFeature(context.site.id, featurePath);
  if (!siteFeature) return NextResponse.json({ error: '找不到已啟用的功能' }, { status: 404 });

  const entry = await findEntry(context.site.id, siteFeature.featureId, rawEntryId);
  if (!entry) return NextResponse.json({ error: '找不到功能資料' }, { status: 404 });

  try {
    await prisma.featureEntry.delete({ where: { id: entry.id } });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除功能資料失敗' }, { status: 500 });
  }
}

async function findEnabledFeature(siteId: number, featurePath: string) {
  return prisma.siteFeature.findFirst({
    where: { siteId, enabled: true, feature: { path: featurePath } },
    select: { featureId: true },
  });
}

async function findEntry(siteId: number, featureId: number, rawEntryId: string) {
  const entryId = Number(rawEntryId);
  if (!Number.isInteger(entryId) || entryId < 1) return null;
  return prisma.featureEntry.findFirst({
    where: { id: entryId, siteId, featureId },
    include: { media: { select: { id: true, url: true, altText: true } } },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
