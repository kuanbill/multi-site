import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { resolveMediaVisibility } from '@/lib/mediaAccess';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename: raw } = await params;
  const filename = path.basename(raw);
  const media = await prisma.media.findFirst({
    where: { filename },
    include: { site: { select: { slug: true, status: true } } },
  });
  if (!media || media.site.status === 'archived') return new NextResponse('找不到檔案', { status: 404 });

  const visibility = await resolveMediaVisibility(media.siteId, media.id);
  if (!visibility.publicReference && !visibility.memberReference) {
    return new NextResponse('找不到檔案', { status: 404 });
  }

  let memberAuthorized = false;
  // A shared asset is protected if any published member-only feature references it.
  if (visibility.memberReference) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.redirect(new URL(`/${media.site.slug}/login`, _request.url));
    memberAuthorized = session.user.role === 'admin' || Boolean(await prisma.siteUser.findFirst({
      where: { userId: Number(session.user.id), siteId: media.siteId },
      select: { id: true },
    }));
    if (!memberAuthorized) return new NextResponse('無權限', { status: 403 });
  }

  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');
  try {
    const body = await readFile(path.join(uploadDir, filename));
    return new NextResponse(body, {
      headers: {
        'Content-Type': media.mimeType ?? 'application/octet-stream',
        'Content-Length': String(body.byteLength),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new NextResponse('找不到檔案', { status: 404 });
  }
}
