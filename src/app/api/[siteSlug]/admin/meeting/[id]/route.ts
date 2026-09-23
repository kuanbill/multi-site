import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { parseContentStatus, validateMeetingType, validateRequiredText } from '@/lib/contentValidation';

type RouteContext = { params: Promise<{ siteSlug: string; id: string }> };

function parseId(value: string): number | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return null;
  return number;
}

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
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const meetingId = parseId(id);
  if (meetingId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }
  const item = await prisma.meetingRecord.findFirst({
    where: { id: meetingId, siteId: context.site.id },
  });
  if (!item) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  }
  const attachments = await prisma.contentAttachment.findMany({
    where: { siteId: context.site.id, ownerType: 'meeting', ownerId: meetingId },
    include: { media: true },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json({ ...item, attachments });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const meetingId = parseId(id);
  if (meetingId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.meetingRecord.findFirst({
    where: { id: meetingId, siteId: context.site.id },
  });
  if (!existing) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;

  let title: string | undefined;
  let meetingType: string | undefined;
  let meetingDate: Date | undefined;
  let status: string | undefined;
  let attachmentIds: number[] | undefined;
  let imageAttachmentIds: number[] | undefined;
  try {
    if (record.title !== undefined) title = validateRequiredText(record.title, 'title');
    if (record.meetingType !== undefined) meetingType = validateMeetingType(record.meetingType);
    if (record.meetingDate !== undefined) meetingDate = parseMeetingDate(record.meetingDate);
    if (record.status !== undefined) status = parseContentStatus(record.status);
    if (record.attachmentIds !== undefined || record.attachments !== undefined || record.mediaIds !== undefined) {
      attachmentIds = parseAttachmentIds(record.attachmentIds ?? record.attachments ?? record.mediaIds);
    }
    if (record.imageAttachmentIds !== undefined || record.additionalImageIds !== undefined || record.imageAttachments !== undefined) {
      imageAttachmentIds = parseAttachmentIds(record.imageAttachmentIds ?? record.additionalImageIds ?? record.imageAttachments);
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  const meetingNo = record.meetingNo !== undefined
    ? (typeof record.meetingNo === 'string' ? record.meetingNo.trim() || null : null)
    : undefined;
  const summary = record.summary !== undefined
    ? (typeof record.summary === 'string' ? record.summary.trim() || null : null)
    : undefined;

  let sortOrder: number | undefined;
  if (record.sortOrder !== undefined) {
    const value = record.sortOrder === null || record.sortOrder === '' ? 0 : Number(record.sortOrder);
    if (!Number.isInteger(value)) {
      return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
    }
    sortOrder = value;
  }

  // Validate attachments if either list provided
  if (attachmentIds !== undefined || imageAttachmentIds !== undefined) {
    const allIds = [...(attachmentIds ?? []), ...(imageAttachmentIds ?? [])];
    const uniqueIds = [...new Set(allIds)];
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
        if (!isImage && isInImageList) {
          return NextResponse.json({ error: '額外圖片附件僅允許圖片' }, { status: 400 });
        }
      }
    }
  }

  const nextStatus = status ?? existing.status;
  let publishedAt: Date | null | undefined;
  if (status !== undefined) {
    if (nextStatus === 'published') {
      publishedAt = existing.publishedAt ?? new Date();
    } else {
      publishedAt = null;
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const meeting = await tx.meetingRecord.update({
        where: { id: meetingId },
        data: {
          title,
          meetingType,
          meetingDate,
          meetingNo,
          summary,
          status,
          sortOrder,
          ...(publishedAt !== undefined ? { publishedAt } : {}),
        },
      });

      if (attachmentIds !== undefined || imageAttachmentIds !== undefined) {
        await tx.contentAttachment.deleteMany({
          where: { siteId: context.site.id, ownerType: 'meeting', ownerId: meetingId },
        });
        const createData: Array<{ siteId: number; mediaId: number; ownerType: string; ownerId: number; sortOrder: number; label: string | null }> = [];
        const finalAttachmentIds = attachmentIds ?? [];
        const finalImageIds = imageAttachmentIds ?? [];
        // If only one list provided and the other undefined, we replace with provided list only.
        // If caller sent only attachmentIds, image list is considered empty; if only image list, main list empty.
        // To allow partial attachment update, require both or handle accordingly: we already have logic.
        // If one is undefined, we treat missing as empty only if the other was explicitly provided.
        // However if both were undefined we wouldn't be here.
        finalAttachmentIds.forEach((mediaId, index) => {
          createData.push({ siteId: context.site.id, mediaId, ownerType: 'meeting', ownerId: meetingId, sortOrder: index, label: 'pdf' });
        });
        const offset = finalAttachmentIds.length;
        finalImageIds.forEach((mediaId, index) => {
          createData.push({ siteId: context.site.id, mediaId, ownerType: 'meeting', ownerId: meetingId, sortOrder: offset + index, label: 'image' });
        });
        if (createData.length > 0) {
          await tx.contentAttachment.createMany({ data: createData });
        }
      }

      return meeting;
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'delete');
  const meetingId = parseId(id);
  if (meetingId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.meetingRecord.findFirst({
    where: { id: meetingId, siteId: context.site.id },
  });
  if (!existing) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.contentAttachment.deleteMany({
        where: { siteId: context.site.id, ownerType: 'meeting', ownerId: meetingId },
      });
      await tx.meetingRecord.delete({ where: { id: meetingId } });
    });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
