import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const ATTACHMENT_FEATURES = {
  announcement: 'announcements',
  progress: 'progress',
  exhibition: 'exhibitions',
  meeting: 'meetings',
  vendor: 'vendors',
  selection: 'selection',
  map: 'maps',
} as const;

type AttachmentOwner = keyof typeof ATTACHMENT_FEATURES;

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename: raw } = await params;
  const filename = path.basename(raw);
  const media = await prisma.media.findFirst({
    where: { filename },
    include: { site: { select: { slug: true, status: true } } },
  });
  if (!media || media.site.status === 'archived') return new NextResponse('找不到檔案', { status: 404 });

  const siteFeatures = await prisma.siteFeature.findMany({
    where: { siteId: media.siteId, enabled: true },
    include: { feature: { select: { key: true } } },
  });
  const featureAccess = new Map(siteFeatures.map((item) => [item.feature.key, item.visibility]));
  let hasPublicPublishedReference = false;
  let hasMemberPublishedReference = false;

  const allowByFeature = (featureKey: string) => {
    const visibility = featureAccess.get(featureKey);
    if (visibility === 'public') hasPublicPublishedReference = true;
    if (visibility === 'members') hasMemberPublishedReference = true;
  };

  const home = await prisma.siteHome.findFirst({
    where: { siteId: media.siteId, heroMediaId: media.id },
    select: { id: true },
  });
  if (home) hasPublicPublishedReference = true;

  const [vendorLogo, mapAsset, attachments] = await Promise.all([
    prisma.vendor.findFirst({
      where: { siteId: media.siteId, logoMediaId: media.id, status: 'published' },
      select: { id: true },
    }),
    prisma.mapAsset.findFirst({
      where: { siteId: media.siteId, status: 'published', OR: [{ imageMediaId: media.id }, { downloadMediaId: media.id }] },
      select: { id: true },
    }),
    prisma.contentAttachment.findMany({
      where: { siteId: media.siteId, mediaId: media.id },
      select: { ownerType: true, ownerId: true },
    }),
  ]);
  if (vendorLogo) allowByFeature('vendors');
  if (mapAsset) allowByFeature('maps');

  const attachmentIds = new Map<AttachmentOwner, number[]>();
  for (const attachment of attachments) {
    if (!(attachment.ownerType in ATTACHMENT_FEATURES)) continue;
    const ownerType = attachment.ownerType as AttachmentOwner;
    const ids = attachmentIds.get(ownerType) ?? [];
    ids.push(attachment.ownerId);
    attachmentIds.set(ownerType, ids);
  }

  const publishedOwnerChecks: Array<[AttachmentOwner, Promise<Array<{ id: number }>>]> = [
    ['announcement', prisma.announcement.findMany({ where: { siteId: media.siteId, status: 'published', id: { in: attachmentIds.get('announcement') ?? [] } }, select: { id: true } })],
    ['progress', prisma.progressItem.findMany({ where: { siteId: media.siteId, status: 'published', id: { in: attachmentIds.get('progress') ?? [] } }, select: { id: true } })],
    ['exhibition', prisma.exhibition.findMany({ where: { siteId: media.siteId, status: 'published', id: { in: attachmentIds.get('exhibition') ?? [] } }, select: { id: true } })],
    ['meeting', prisma.meetingRecord.findMany({ where: { siteId: media.siteId, status: 'published', id: { in: attachmentIds.get('meeting') ?? [] } }, select: { id: true } })],
    ['vendor', prisma.vendor.findMany({ where: { siteId: media.siteId, status: 'published', id: { in: attachmentIds.get('vendor') ?? [] } }, select: { id: true } })],
    ['selection', prisma.selectionInfo.findMany({ where: { siteId: media.siteId, status: 'published', id: { in: attachmentIds.get('selection') ?? [] } }, select: { id: true } })],
    ['map', prisma.mapAsset.findMany({ where: { siteId: media.siteId, status: 'published', id: { in: attachmentIds.get('map') ?? [] } }, select: { id: true } })],
  ];
  const publishedOwners = await Promise.all(publishedOwnerChecks.map(([, query]) => query));

  for (const [[ownerType], records] of publishedOwnerChecks.map((entry, index) => [entry, publishedOwners[index]] as const)) {
    if (records.length > 0) allowByFeature(ATTACHMENT_FEATURES[ownerType]);
  }

  if (!hasPublicPublishedReference && !hasMemberPublishedReference) {
    return new NextResponse('找不到檔案', { status: 404 });
  }

  let memberAuthorized = false;
  // A shared asset is protected if any published member-only feature references it.
  if (hasMemberPublishedReference) {
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
