import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { resolveMediaVisibility } from '@/lib/mediaAccess';
import { isUnlimitedEditor } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// 錯誤回應若沒有快取標頭，邊緣節點會把 404 留住，導致媒體轉為公開後仍持續回 404。
const UNCACHEABLE = 'private, no-store';

function notFoundResponse(message: string): NextResponse {
  return new NextResponse(message, { status: 404, headers: { 'Cache-Control': UNCACHEABLE } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename: raw } = await params;
  const filename = path.basename(raw);
  const media = await prisma.media.findFirst({
    where: { filename },
    include: { site: { select: { slug: true, status: true } } },
  });
  if (!media || media.site.status === 'archived') return notFoundResponse('找不到檔案');

  const visibility = await resolveMediaVisibility(media.siteId, media.id);
  if (!visibility.publicReference && !visibility.memberReference) {
    return notFoundResponse('找不到檔案');
  }

  // A shared asset is protected if any published member-only feature references it.
  if (visibility.memberReference) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.redirect(new URL(`/${media.site.slug}/login`, _request.url));
    // 與 isSiteMember 相同語意：全域管理員與不設限編輯者視為本站成員，
    // 後者沒有 siteUser 成員列，若只查成員列會把他們擋成 403 破圖。
    const memberAuthorized =
      session.user.role === 'admin' ||
      isUnlimitedEditor(session.user) ||
      Boolean(await prisma.siteUser.findFirst({
        where: { userId: Number(session.user.id), siteId: media.siteId },
        select: { id: true },
      }));
    if (!memberAuthorized) {
      return new NextResponse('無權限', { status: 403, headers: { 'Cache-Control': UNCACHEABLE } });
    }
  }

  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'data', 'uploads');
  try {
    const body = await readFile(path.join(uploadDir, filename));
    return new NextResponse(body, {
      headers: {
        'Content-Type': media.mimeType ?? 'application/octet-stream',
        'Content-Length': String(body.byteLength),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': UNCACHEABLE,
      },
    });
  } catch {
    return notFoundResponse('找不到檔案');
  }
}
