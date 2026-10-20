import { NextResponse } from 'next/server';
import { requireContentPermission } from '@/lib/contentAccess';
import { parseContentStatus, validateExternalUrl, validateRequiredText } from '@/lib/contentValidation';
import { prisma } from '@/lib/prisma';
import { GOOGLE_DRIVE_LINK_ERROR, parseGoogleDriveUrls, syncContentExternalLinks } from '@/lib/contentExternalLinks';

type RouteContext = { params: Promise<{ siteSlug: string }> };
type AttachmentInput = { mediaId: number; label: string | null };

function parseAttachments(value: unknown): AttachmentInput[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error('附件參數錯誤');
  const seen = new Set<number>();
  return value.map((item) => {
    if (typeof item !== 'object' || item === null || !('mediaId' in item)) throw new Error('附件參數錯誤');
    const rawMediaId = (item as Record<string, unknown>).mediaId;
    const mediaId = typeof rawMediaId === 'number' ? rawMediaId : Number(rawMediaId);
    if (!Number.isInteger(mediaId) || mediaId < 1 || seen.has(mediaId)) throw new Error('附件參數錯誤');
    seen.add(mediaId);
    const rawLabel = (item as Record<string, unknown>).label;
    if (rawLabel !== undefined && rawLabel !== null && typeof rawLabel !== 'string') throw new Error('附件名稱格式錯誤');
    return { mediaId, label: typeof rawLabel === 'string' ? rawLabel.trim() || null : null };
  });
}

function parseDeadline(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const deadline = new Date(String(value));
  if (Number.isNaN(deadline.getTime())) throw new Error('截止日期格式無效');
  return deadline;
}

function parseText(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const items = await prisma.selectionInfo.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  const attachments = await prisma.contentAttachment.findMany({
    where: { siteId: context.site.id, ownerType: 'selection', ownerId: { in: items.map((item) => item.id) } },
    include: { media: true },
    orderBy: { sortOrder: 'asc' },
  });
  const externalLinks = await prisma.contentExternalLink.findMany({
    where: { siteId: context.site.id, ownerType: 'selection', ownerId: { in: items.map((item) => item.id) } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  const byOwner = new Map<number, typeof attachments>();
  for (const attachment of attachments) {
    const ownerAttachments = byOwner.get(attachment.ownerId) ?? [];
    ownerAttachments.push(attachment);
    byOwner.set(attachment.ownerId, ownerAttachments);
  }
  const linksByOwner = new Map<number, string[]>();
  for (const link of externalLinks) linksByOwner.set(link.ownerId, [...(linksByOwner.get(link.ownerId) ?? []), link.url]);
  return NextResponse.json(items.map((item) => ({ ...item, attachments: byOwner.get(item.id) ?? [], driveUrls: linksByOwner.get(item.id) ?? [] })));
}

export async function POST(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  let title: string;
  let status: string;
  let externalUrl: string | null;
  let deadline: Date | null;
  let attachments: AttachmentInput[];
  let driveUrls: string[] | undefined;
  try {
    title = validateRequiredText(body.title, 'title');
    status = body.status === undefined || body.status === '' ? 'draft' : parseContentStatus(body.status);
    externalUrl = validateExternalUrl(body.externalUrl);
    deadline = parseDeadline(body.deadline);
    attachments = parseAttachments(body.attachments);
    if (body.driveUrls !== undefined) driveUrls = parseGoogleDriveUrls(body.driveUrls);
  } catch (error) {
    if (error instanceof Error && error.message === GOOGLE_DRIVE_LINK_ERROR) {
      return NextResponse.json({ error: GOOGLE_DRIVE_LINK_ERROR }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  if (attachments.length) {
    const medias = await prisma.media.findMany({
      where: { id: { in: attachments.map(({ mediaId }) => mediaId) }, siteId: context.site.id },
      select: { id: true },
    });
    if (medias.length !== attachments.length) {
      return NextResponse.json({ error: '附件不存在或不屬於此站點' }, { status: 400 });
    }
  }

  const publishedAt = status === 'published' ? new Date() : null;
  try {
    const created = await prisma.$transaction(async (tx) => {
      const selection = await tx.selectionInfo.create({
        data: {
          siteId: context.site.id,
          title,
          description: parseText(body.description),
          applicableStage: parseText(body.applicableStage),
          rules: parseText(body.rules),
          notice: parseText(body.notice),
          deadline,
          externalUrl,
          status,
          publishedAt,
        },
      });
      if (attachments.length) {
        await tx.contentAttachment.createMany({
          data: attachments.map(({ mediaId, label }, sortOrder) => ({
            siteId: context.site.id,
            mediaId,
            ownerType: 'selection',
            ownerId: selection.id,
            label,
            sortOrder,
          })),
        });
      }
      if (driveUrls !== undefined) {
        await syncContentExternalLinks(tx, { siteId: context.site.id, ownerType: 'selection', ownerId: selection.id, urls: driveUrls });
      }
      return selection;
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立失敗' }, { status: 500 });
  }
}
