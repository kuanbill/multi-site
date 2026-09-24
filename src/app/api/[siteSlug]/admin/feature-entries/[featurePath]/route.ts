import { NextResponse } from 'next/server';
import { requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import { validateFeatureEntryInput } from '@/lib/featureEntryValidation';

type RouteContext = { params: Promise<{ siteSlug: string; featurePath: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug, featurePath } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const siteFeature = await findEnabledFeature(context.site.id, featurePath);
  if (!siteFeature) return NextResponse.json({ error: '找不到已啟用的功能' }, { status: 404 });

  const entries = await prisma.featureEntry.findMany({
    where: { siteId: context.site.id, featureId: siteFeature.featureId },
    orderBy: { updatedAt: 'desc' },
    include: { media: { select: { id: true, url: true, altText: true } } },
  });
  return NextResponse.json(entries);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { siteSlug, featurePath } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const siteFeature = await findEnabledFeature(context.site.id, featurePath);
  if (!siteFeature) return NextResponse.json({ error: '找不到已啟用的功能' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  let input;
  try {
    input = validateFeatureEntryInput(body);
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
    const entry = await prisma.featureEntry.create({
      data: {
        siteId: context.site.id,
        featureId: siteFeature.featureId,
        ...input,
      },
      include: { media: { select: { id: true, url: true, altText: true } } },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立功能資料失敗' }, { status: 500 });
  }
}

async function findEnabledFeature(siteId: number, featurePath: string) {
  return prisma.siteFeature.findFirst({
    where: { siteId, enabled: true, feature: { path: featurePath } },
    select: { featureId: true },
  });
}
