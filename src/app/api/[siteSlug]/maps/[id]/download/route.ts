import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { requirePublicFeature } from '@/lib/contentAccess';
import { resolveMediaVisibility } from '@/lib/mediaAccess';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ siteSlug: string; id: string }> }) {
  const { siteSlug, id: rawId } = await params; const { site, publishedWhere } = await requirePublicFeature(siteSlug, 'maps');
  const id = Number(rawId); if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  const item = await prisma.mapAsset.findFirst({ where: { id, siteId: site.id, ...publishedWhere }, include: { downloadMedia: true } });
  if (!item?.downloadMedia) return NextResponse.json({ error: '找不到下載檔案' }, { status: 404 });
  const visibility = await resolveMediaVisibility(site.id, item.downloadMedia.id);
  if (visibility.memberReference) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.redirect(new URL(`/${siteSlug}/login`, _request.url));
    const isMember = session.user.role === 'admin' || Boolean(await prisma.siteUser.findFirst({
      where: { userId: Number(session.user.id), siteId: site.id },
      select: { id: true },
    }));
    if (!isMember) return NextResponse.json({ error: '無權限' }, { status: 403 });
  }
  const media = item.downloadMedia; const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');
  try {
    const body = await readFile(path.join(uploadDir, path.basename(media.filename)));
    return new NextResponse(body, { headers: { 'Content-Type': media.mimeType ?? 'application/octet-stream', 'Content-Disposition': `attachment; filename="${path.basename(media.filename)}"`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: '檔案不存在' }, { status: 404 }); }
}
