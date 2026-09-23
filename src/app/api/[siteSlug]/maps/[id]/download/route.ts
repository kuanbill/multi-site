import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { requirePublicFeature } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ siteSlug: string; id: string }> }) {
  const { siteSlug, id: rawId } = await params; const { site, publishedWhere } = await requirePublicFeature(siteSlug, 'maps');
  const id = Number(rawId); if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  const item = await prisma.mapAsset.findFirst({ where: { id, siteId: site.id, ...publishedWhere }, include: { downloadMedia: true } });
  if (!item?.downloadMedia) return NextResponse.json({ error: '找不到下載檔案' }, { status: 404 });
  const media = item.downloadMedia; const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');
  try {
    const body = await readFile(path.join(uploadDir, path.basename(media.filename)));
    return new NextResponse(body, { headers: { 'Content-Type': media.mimeType ?? 'application/octet-stream', 'Content-Disposition': `attachment; filename="${path.basename(media.filename)}"`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: '檔案不存在' }, { status: 404 }); }
}
