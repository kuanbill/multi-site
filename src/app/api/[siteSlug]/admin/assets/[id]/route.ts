import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { canPerformContentAction, requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
type RouteContext = { params: Promise<{ siteSlug: string; id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'delete');
  if (context.siteRole !== 'global-admin' && context.siteRole !== 'admin' || !canPerformContentAction(context.siteRole, 'delete')) {
    return NextResponse.json({ error: '沒有刪除權限' }, { status: 403 });
  }
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId) || mediaId < 1) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');
  let filePath: string;
  try {
    await prisma.$transaction(async (tx) => {
      const media = await tx.media.findFirst({ where: { id: mediaId, siteId: context.site.id } });
      if (!media) throw new Error('NOT_FOUND');
      filePath = path.join(uploadDir, path.basename(media.filename));

      const [attachment, home, vendor, map] = await Promise.all([
        tx.contentAttachment.findFirst({ where: { mediaId, siteId: context.site.id }, select: { id: true } }),
        tx.siteHome.findFirst({ where: { heroMediaId: mediaId, siteId: context.site.id }, select: { id: true } }),
        tx.vendor.findFirst({ where: { logoMediaId: mediaId, siteId: context.site.id }, select: { id: true } }),
        tx.mapAsset.findFirst({ where: { OR: [{ imageMediaId: mediaId }, { downloadMediaId: mediaId }], siteId: context.site.id }, select: { id: true } }),
      ]);
      if (attachment || home || vendor || map) throw new Error('REFERENCED');
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
