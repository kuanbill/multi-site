import { NextResponse } from 'next/server';
import { requireContentPermission } from '@/lib/contentAccess';
import { parseContentStatus, validateExternalUrl, validateRequiredText } from '@/lib/contentValidation';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ siteSlug: string; id: string }> };
type AttachmentInput = { mediaId: number; label: string | null };

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseAttachments(value: unknown): AttachmentInput[] {
  if (value === null) return [];
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
  if (value === null || value === '') return null;
  const deadline = new Date(String(value));
  if (Number.isNaN(deadline.getTime())) throw new Error('截止日期格式無效');
  return deadline;
}

function parseText(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() || null : null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug, id: rawId } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });

  const selection = await prisma.selectionInfo.findFirst({ where: { id, siteId: context.site.id } });
  if (!selection) return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  const attachments = await prisma.contentAttachment.findMany({
    where: { siteId: context.site.id, ownerType: 'selection', ownerId: id },
    include: { media: true },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json({ ...selection, attachments });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug, id: rawId } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });

  const existing = await prisma.selectionInfo.findFirst({ where: { id, siteId: context.site.id } });
  if (!existing) return NextResponse.json({ error: '找不到資料' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  let attachments: AttachmentInput[] | undefined;
  try {
    if (body.title !== undefined) data.title = validateRequiredText(body.title, 'title');
    for (const key of ['description', 'applicableStage', 'rules', 'notice'] as const) {
      if (body[key] !== undefined) data[key] = parseText(body[key]);
    }
    if (body.externalUrl !== undefined) data.externalUrl = validateExternalUrl(body.externalUrl);
    if (body.deadline !== undefined) data.deadline = parseDeadline(body.deadline);
    if (body.status !== undefined) {
      const status = parseContentStatus(body.status);
      data.status = status;
      data.publishedAt = status === 'published' ? existing.publishedAt ?? new Date() : null;
    }
    if (body.attachments !== undefined) attachments = parseAttachments(body.attachments);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  if (attachments?.length) {
    const medias = await prisma.media.findMany({
      where: { id: { in: attachments.map(({ mediaId }) => mediaId) }, siteId: context.site.id },
      select: { id: true },
    });
    if (medias.length !== attachments.length) {
      return NextResponse.json({ error: '附件不存在或不屬於此站點' }, { status: 400 });
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const selection = await tx.selectionInfo.update({ where: { id }, data });
      if (attachments !== undefined) {
        await tx.contentAttachment.deleteMany({ where: { siteId: context.site.id, ownerType: 'selection', ownerId: id } });
        if (attachments.length) {
          await tx.contentAttachment.createMany({
            data: attachments.map(({ mediaId, label }, sortOrder) => ({
              siteId: context.site.id,
              mediaId,
              ownerType: 'selection',
              ownerId: id,
              label,
              sortOrder,
            })),
          });
        }
      }
      return selection;
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, id: rawId } = await params;
  const context = await requireContentPermission(siteSlug, 'delete');
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });

  const existing = await prisma.selectionInfo.findFirst({ where: { id, siteId: context.site.id } });
  if (!existing) return NextResponse.json({ error: '找不到資料' }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.contentAttachment.deleteMany({ where: { siteId: context.site.id, ownerType: 'selection', ownerId: id } });
      await tx.selectionInfo.delete({ where: { id } });
    });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
