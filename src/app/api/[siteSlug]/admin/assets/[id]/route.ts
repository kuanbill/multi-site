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
  const media = await prisma.media.findFirst({ where: { id: mediaId, siteId: context.site.id } });
  if (!media) return NextResponse.json({ error: '找不到媒體' }, { status: 404 });
  const referenced = await prisma.$transaction(async (tx) => {
    const attachment = await tx.contentAttachment.findFirst({ where: { mediaId, siteId: context.site.id } });
    const home = await tx.siteHome.findFirst({ where: { heroMediaId: mediaId, siteId: context.site.id } });
    const vendor = await tx.vendor.findFirst({ where: { logoMediaId: mediaId, siteId: context.site.id } });
    const map = await tx.mapAsset.findFirst({ where: { OR: [{ imageMediaId: mediaId }, { downloadMediaId: mediaId }], siteId: context.site.id } });
    return Boolean(attachment || home || vendor || map);
  });
  if (referenced) return NextResponse.json({ error: '媒體仍被內容引用，請先解除引用' }, { status: 409 });
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');
  const filePath = path.join(uploadDir, path.basename(media.filename));
  try {
    await unlink(filePath);
    await prisma.media.delete({ where: { id: mediaId } });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
