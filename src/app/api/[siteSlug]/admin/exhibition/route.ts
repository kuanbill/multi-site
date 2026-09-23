import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { parseContentStatus, validateDateRange, validateRequiredText, validateSlug } from '@/lib/contentValidation';

type RouteContext = { params: Promise<{ siteSlug: string }> };

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

  const items = await prisma.exhibition.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
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
  let slug: string;
  let status: string;
  let startDate: Date | null;
  let endDate: Date | null;
  let attachmentIds: number[] | undefined;
  try {
    title = validateRequiredText(record.title, 'title');
    slug = validateSlug(record.slug);
    status = record.status === undefined || record.status === null || record.status === ''
      ? 'draft'
      : parseContentStatus(record.status);
    const range = validateDateRange(record.startDate, record.endDate);
    startDate = range.startDate;
    endDate = range.endDate;
    attachmentIds = parseAttachmentIds(record.attachmentIds ?? record.attachments ?? record.mediaIds);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  const location = typeof record.location === 'string' ? record.location.trim() || null : null;
  const description = typeof record.description === 'string' ? record.description.trim() || null : null;
  const feedbackSummary = typeof record.feedbackSummary === 'string' ? record.feedbackSummary.trim() || null : null;
  const sortOrder = record.sortOrder === undefined || record.sortOrder === null || record.sortOrder === ''
    ? 0
    : Number(record.sortOrder);
  if (!Number.isInteger(sortOrder)) {
    return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.exhibition.findUnique({
    where: { siteId_slug: { siteId: context.site.id, slug } },
  });
  if (existing) {
    return NextResponse.json({ error: '識別碼已存在' }, { status: 409 });
  }

  if (attachmentIds && attachmentIds.length > 0) {
    const medias = await prisma.media.findMany({
      where: { id: { in: attachmentIds }, siteId: context.site.id },
      select: { id: true },
    });
    if (medias.length !== attachmentIds.length) {
      return NextResponse.json({ error: '附件不存在或不屬於此站點' }, { status: 400 });
    }
  }

  const publishedAt = status === 'published' ? new Date() : null;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const exhibition = await tx.exhibition.create({
        data: {
          siteId: context.site.id,
          title,
          slug,
          startDate,
          endDate,
          location,
          description,
          feedbackSummary,
          status,
          sortOrder,
          publishedAt,
        },
      });
      if (attachmentIds && attachmentIds.length > 0) {
        await tx.contentAttachment.createMany({
          data: attachmentIds.map((mediaId, index) => ({
            siteId: context.site.id,
            mediaId,
            ownerType: 'exhibition',
            ownerId: exhibition.id,
            sortOrder: index,
          })),
        });
      }
      return exhibition;
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立失敗' }, { status: 500 });
  }
}
