import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { parseContentStatus, validateDateRange, validateRequiredText, validateSlug } from '@/lib/contentValidation';

type RouteContext = { params: Promise<{ siteSlug: string; id: string }> };

function parseId(value: string): number | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return null;
  return number;
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
  const exhibitionId = parseId(id);
  if (exhibitionId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const item = await prisma.exhibition.findFirst({
    where: { id: exhibitionId, siteId: context.site.id },
  });
  if (!item) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  }
  const attachments = await prisma.contentAttachment.findMany({
    where: { siteId: context.site.id, ownerType: 'exhibition', ownerId: exhibitionId },
    include: { media: true },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json({ ...item, attachments });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const exhibitionId = parseId(id);
  if (exhibitionId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.exhibition.findFirst({
    where: { id: exhibitionId, siteId: context.site.id },
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
  let slug: string | undefined;
  let status: string | undefined;
  let startDate: Date | null | undefined;
  let endDate: Date | null | undefined;
  let attachmentIds: number[] | undefined;
  try {
    if (record.title !== undefined) title = validateRequiredText(record.title, 'title');
    if (record.slug !== undefined) slug = validateSlug(record.slug);
    if (record.status !== undefined) status = parseContentStatus(record.status);
    if (record.startDate !== undefined || record.endDate !== undefined) {
      const range = validateDateRange(
        record.startDate !== undefined ? record.startDate : existing.startDate,
        record.endDate !== undefined ? record.endDate : existing.endDate,
      );
      if (record.startDate !== undefined) startDate = range.startDate;
      if (record.endDate !== undefined) endDate = range.endDate;
    }
    if (record.attachmentIds !== undefined || record.attachments !== undefined || record.mediaIds !== undefined) {
      attachmentIds = parseAttachmentIds(record.attachmentIds ?? record.attachments ?? record.mediaIds);
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  if (slug && slug !== existing.slug) {
    const duplicate = await prisma.exhibition.findUnique({
      where: { siteId_slug: { siteId: context.site.id, slug } },
    });
    if (duplicate) {
      return NextResponse.json({ error: '識別碼已存在' }, { status: 409 });
    }
  }

  const location = record.location !== undefined
    ? (typeof record.location === 'string' ? record.location.trim() || null : null)
    : undefined;
  const description = record.description !== undefined
    ? (typeof record.description === 'string' ? record.description.trim() || null : null)
    : undefined;
  const feedbackSummary = record.feedbackSummary !== undefined
    ? (typeof record.feedbackSummary === 'string' ? record.feedbackSummary.trim() || null : null)
    : undefined;

  let sortOrder: number | undefined;
  if (record.sortOrder !== undefined) {
    const value = record.sortOrder === null || record.sortOrder === '' ? 0 : Number(record.sortOrder);
    if (!Number.isInteger(value)) {
      return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
    }
    sortOrder = value;
  }

  if (attachmentIds !== undefined && attachmentIds.length > 0) {
    const medias = await prisma.media.findMany({
      where: { id: { in: attachmentIds }, siteId: context.site.id },
      select: { id: true },
    });
    if (medias.length !== attachmentIds.length) {
      return NextResponse.json({ error: '附件不存在或不屬於此站點' }, { status: 400 });
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
      const data: Record<string, unknown> = {
        title,
        slug,
        location,
        description,
        feedbackSummary,
        status,
        sortOrder,
      };
      if (startDate !== undefined) (data as Record<string, unknown>).startDate = startDate;
      if (endDate !== undefined) (data as Record<string, unknown>).endDate = endDate;
      if (publishedAt !== undefined) (data as Record<string, unknown>).publishedAt = publishedAt;
      // remove undefined keys
      Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

      const exhibition = await tx.exhibition.update({
        where: { id: exhibitionId },
        data,
      });

      if (attachmentIds !== undefined) {
        await tx.contentAttachment.deleteMany({
          where: { siteId: context.site.id, ownerType: 'exhibition', ownerId: exhibitionId },
        });
        if (attachmentIds.length > 0) {
          await tx.contentAttachment.createMany({
            data: attachmentIds.map((mediaId, index) => ({
              siteId: context.site.id,
              mediaId,
              ownerType: 'exhibition',
              ownerId: exhibitionId,
              sortOrder: index,
            })),
          });
        }
      }

      return exhibition;
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'delete');
  const exhibitionId = parseId(id);
  if (exhibitionId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.exhibition.findFirst({
    where: { id: exhibitionId, siteId: context.site.id },
  });
  if (!existing) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.contentAttachment.deleteMany({
        where: { siteId: context.site.id, ownerType: 'exhibition', ownerId: exhibitionId },
      });
      await tx.exhibition.delete({ where: { id: exhibitionId } });
    });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
