import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ siteSlug: string; id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId) || mediaId < 1) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }
  const body = (typeof rawBody === 'object' && rawBody !== null ? rawBody : {}) as Record<string, unknown>;
  const altText =
    body.altText === null
      ? null
      : typeof body.altText === 'string'
        ? body.altText.trim() || null
        : undefined;
  if (altText === undefined) return NextResponse.json({ error: '說明文字參數錯誤' }, { status: 400 });

  const media = await prisma.media.findFirst({ where: { id: mediaId, siteId: context.site.id } });
  if (!media) return NextResponse.json({ error: '找不到媒體' }, { status: 404 });

  try {
    const updated = await prisma.media.update({ where: { id: mediaId }, data: { altText } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  // 媒體屬站內資源且已以 siteId 嚴格過濢，編輯者對所屬子網站的媒體享有完整管理權限。
  const context = await requireContentPermission(siteSlug, 'write');
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId) || mediaId < 1) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');
  let filePath: string;
  try {
    await prisma.$transaction(async (tx) => {
      const media = await tx.media.findFirst({ where: { id: mediaId, siteId: context.site.id } });
      if (!media) throw new Error('NOT_FOUND');
      filePath = path.join(uploadDir, path.basename(media.filename));

      const [attachment, home, vendor, map, featureEntry] = await Promise.all([
        tx.contentAttachment.findFirst({ where: { mediaId, siteId: context.site.id }, select: { id: true } }),
        tx.siteHome.findFirst({ where: { heroMediaId: mediaId, siteId: context.site.id }, select: { id: true } }),
        tx.vendor.findFirst({ where: { logoMediaId: mediaId, siteId: context.site.id }, select: { id: true } }),
        tx.mapAsset.findFirst({ where: { OR: [{ imageMediaId: mediaId }, { downloadMediaId: mediaId }], siteId: context.site.id }, select: { id: true } }),
        tx.featureEntry.findFirst({ where: { siteId: context.site.id, mediaId }, select: { id: true } }),
      ]);
      if (attachment || home || vendor || map || featureEntry) throw new Error('REFERENCED');
      await tx.media.delete({ where: { id: mediaId } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: '找不到媒體' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'REFERENCED') {
      return NextResponse.json({ error: '媒體仍被內容引用，請先解除引用' }, { status: 409 });
    }
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }

  try {
    await unlink(filePath!);
  } catch {
    // DB metadata has been removed; an orphaned disk file is inaccessible by URL lookup.
  }
  return NextResponse.json({ message: '已刪除' });
}
