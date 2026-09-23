import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { parseContentStatus, validateMeetingType, validateRequiredText } from '@/lib/contentValidation';

type RouteContext = { params: Promise<{ siteSlug: string }> };

function parseMeetingDate(value: unknown): Date {
  if (value === null || value === undefined || value === '') throw new Error('會議日期不得為空');
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error('會議日期格式無效');
  return date;
}

function parseAttachmentIds(value: unknown): number[] | undefined {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (!Array.isArray(value)) throw new Error('附件參數錯誤');
  const ids: number[] = [];
  for (const item of value) {
    const raw = typeof item === 'object' && item !== null && 'mediaId' in (item as Record<string, unknown>)
      ? (item as Record<string, unknown>).mediaId
      : item;
    const number = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isInteger(number) || number < 1) throw new Error('附件參數錯誤');
    ids.push(number);
  }
  return ids;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const items = await prisma.meetingRecord.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ meetingDate: 'desc' }, { sortOrder: 'asc' }],
  });
  return NextResponse.json(items);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;

  let title: string;
  let meetingType: string;
  let meetingDate: Date;
  let status: string;
  let attachmentIds: number[] | undefined;
  let imageAttachmentIds: number[] | undefined;
  try {
    title = validateRequiredText(record.title, 'title');
    meetingType = validateMeetingType(record.meetingType);
    meetingDate = parseMeetingDate(record.meetingDate);
    status = record.status === undefined || record.status === null || record.status === ''
      ? 'draft'
      : parseContentStatus(record.status);
    attachmentIds = parseAttachmentIds(record.attachmentIds ?? record.attachments ?? record.mediaIds);
    imageAttachmentIds = parseAttachmentIds(record.imageAttachmentIds ?? record.additionalImageIds ?? record.imageAttachments);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  const meetingNo = typeof record.meetingNo === 'string' ? record.meetingNo.trim() || null : null;
  const summary = typeof record.summary === 'string' ? record.summary.trim() || null : null;
  const sortOrder = record.sortOrder === undefined || record.sortOrder === null || record.sortOrder === ''
    ? 0
    : Number(record.sortOrder);
  if (!Number.isInteger(sortOrder)) {
    return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
  }

  const allAttachmentIds = [...(attachmentIds ?? []), ...(imageAttachmentIds ?? [])];
  // Deduplicate for validation
  const uniqueIds = [...new Set(allAttachmentIds)];
  if (uniqueIds.length > 0) {
    const medias = await prisma.media.findMany({
      where: { id: { in: uniqueIds }, siteId: context.site.id },
      select: { id: true, type: true, mimeType: true },
    });
    if (medias.length !== uniqueIds.length) {
      return NextResponse.json({ error: '附件不存在或不屬於此站點' }, { status: 400 });
    }
    const imageIdsSet = new Set(imageAttachmentIds ?? []);
    for (const media of medias) {
      const isImage = media.type === 'image' || (media.mimeType?.startsWith('image/') ?? false);
      const isInImageList = imageIdsSet.has(media.id);
      const isInMainList = (attachmentIds ?? []).includes(media.id);
      if (isImage && isInMainList && !isInImageList) {
        return NextResponse.json({ error: '會議記錄僅允許 PDF，請將圖片標記為額外圖片附件' }, { status: 400 });
      }
      if (isImage && !isInMainList && !isInImageList) {
        // image only in image list is allowed
      }
      if (!isImage && isInImageList) {
        // image list should only contain images, but allow pdf misplacement? treat as error
        return NextResponse.json({ error: '額外圖片附件僅允許圖片' }, { status: 400 });
      }
    }
  }

  const publishedAt = status === 'published' ? new Date() : null;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const meeting = await tx.meetingRecord.create({
        data: {
          siteId: context.site.id,
          meetingType,
          meetingNo,
          title,
          meetingDate,
          summary,
          status,
          sortOrder,
          publishedAt,
        },
      });
      const createData: Array<{ siteId: number; mediaId: number; ownerType: string; ownerId: number; sortOrder: number; label: string | null }> = [];
      if (attachmentIds) {
        attachmentIds.forEach((mediaId, index) => {
          createData.push({ siteId: context.site.id, mediaId, ownerType: 'meeting', ownerId: meeting.id, sortOrder: index, label: 'pdf' });
        });
      }
      if (imageAttachmentIds) {
        const offset = attachmentIds?.length ?? 0;
        imageAttachmentIds.forEach((mediaId, index) => {
          createData.push({ siteId: context.site.id, mediaId, ownerType: 'meeting', ownerId: meeting.id, sortOrder: offset + index, label: 'image' });
        });
      }
      if (createData.length > 0) {
        await tx.contentAttachment.createMany({ data: createData });
      }
      return meeting;
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立失敗' }, { status: 500 });
  }
}
