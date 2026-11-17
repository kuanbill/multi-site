import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';
import { parseContentStatus, validateRequiredText } from '@/lib/contentValidation';
type RouteContext = { params: Promise<{ siteSlug: string; id: string }> };
function parseId(value: string) { const id = Number(value); return Number.isInteger(id) && id > 0 ? id : null; }
async function mediaId(value: unknown, siteId: number) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || !await prisma.media.findFirst({ where: { id, siteId } })) throw new Error('媒體不存在或不屬於此站點');
  return id;
}
export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug, id: rawId } = await params; const context = await requireContentPermission(siteSlug, 'write'); const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  const existing = await prisma.mapAsset.findFirst({ where: { id, siteId: context.site.id } });
  if (!existing) return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  let body: Record<string, unknown>; try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 }); }
  try {
    const title = body.title === undefined ? existing.title : validateRequiredText(body.title, 'title');
    const status = body.status === undefined ? existing.status : parseContentStatus(body.status);
    const sortOrder = body.sortOrder === undefined ? existing.sortOrder : body.sortOrder === '' ? 0 : Number(body.sortOrder);
    if (!Number.isInteger(sortOrder)) throw new Error('排序參數錯誤');
    const imageMediaId = await mediaId(body.imageMediaId, context.site.id); const downloadMediaId = await mediaId(body.downloadMediaId, context.site.id);
    if ((imageMediaId === undefined ? existing.imageMediaId : imageMediaId) === null && (downloadMediaId === undefined ? existing.downloadMediaId : downloadMediaId) === null) throw new Error('請提供地圖圖片或下載檔案');
    const updated = await prisma.mapAsset.update({ where: { id }, data: {
      title, category: body.category === undefined ? existing.category : typeof body.category === 'string' ? body.category.trim() || null : null,
      description: body.description === undefined ? existing.description : typeof body.description === 'string' ? body.description.trim() || null : null,
      sortOrder, status, publishedAt: body.status === undefined ? existing.publishedAt : status === 'published' ? existing.publishedAt ?? new Date() : null,
      ...(imageMediaId !== undefined ? { imageMediaId } : {}), ...(downloadMediaId !== undefined ? { downloadMediaId } : {}),
    }, include: { imageMedia: true, downloadMedia: true } });
    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '更新失敗' }, { status: 400 }); }
}
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, id: rawId } = await params; const context = await requireContentPermission(siteSlug, 'delete'); const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  const existing = await prisma.mapAsset.findFirst({ where: { id, siteId: context.site.id } });
  if (!existing) return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  const attachments = await prisma.contentAttachment.findMany({
    where: { siteId: context.site.id, ownerType: 'map', ownerId: id },
    select: { mediaId: true },
  });
  const mediaIds = [...new Set([
    existing.imageMediaId,
    existing.downloadMediaId,
    ...attachments.map((attachment) => attachment.mediaId),
  ].filter((mediaId): mediaId is number => typeof mediaId === 'number' && Number.isInteger(mediaId) && mediaId > 0))];
  const media = mediaIds.length > 0
    ? await prisma.media.findMany({
      where: { siteId: context.site.id, id: { in: mediaIds } },
      select: { id: true, filename: true },
    })
    : [];
  const filesToDelete: string[] = [];
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');
  await prisma.$transaction(async (tx) => {
    await tx.contentAttachment.deleteMany({ where: { siteId: context.site.id, ownerType: 'map', ownerId: id } });
    await tx.mapAsset.delete({ where: { id } });
    for (const item of media) {
      const [attachment, home, vendor, map, featureEntry] = await Promise.all([
        tx.contentAttachment.findFirst({ where: { mediaId: item.id, siteId: context.site.id }, select: { id: true } }),
        tx.siteHome.findFirst({ where: { heroMediaId: item.id, siteId: context.site.id }, select: { id: true } }),
        tx.vendor.findFirst({ where: { logoMediaId: item.id, siteId: context.site.id }, select: { id: true } }),
        tx.mapAsset.findFirst({ where: { OR: [{ imageMediaId: item.id }, { downloadMediaId: item.id }], siteId: context.site.id }, select: { id: true } }),
        tx.featureEntry.findFirst({ where: { siteId: context.site.id, mediaId: item.id }, select: { id: true } }),
      ]);
      if (attachment || home || vendor || map || featureEntry) continue;
      await tx.media.delete({ where: { id: item.id } });
      filesToDelete.push(path.join(uploadDir, path.basename(item.filename)));
    }
  });
  await Promise.all(filesToDelete.map((filePath) => unlink(filePath).catch(() => undefined)));
  return NextResponse.json({ message: '已刪除' });
}
