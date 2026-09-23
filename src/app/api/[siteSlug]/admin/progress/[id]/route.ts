import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission, requireSiteContext } from '@/lib/contentAccess';
import { parseContentStatus, validateProgressStatus, validateRequiredText } from '@/lib/contentValidation';

type RouteContext = { params: Promise<{ siteSlug: string; id: string }> };

function parseId(value: string): number | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return null;
  return number;
}

function parseStageDate(value: unknown): Date {
  if (value === null || value === undefined || value === '') throw new Error('階段日期不得為空');
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error('階段日期格式無效');
  return date;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireSiteContext(siteSlug);
  const itemId = parseId(id);
  if (itemId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }
  const item = await prisma.progressItem.findFirst({
    where: { id: itemId, siteId: context.site.id },
  });
  if (!item) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const itemId = parseId(id);
  if (itemId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.progressItem.findFirst({
    where: { id: itemId, siteId: context.site.id },
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
  let stageLabel: string | undefined;
  let stageDate: Date | undefined;
  let progressStatus: string | undefined;
  let status: string | undefined;
  try {
    if (record.title !== undefined) title = validateRequiredText(record.title, 'title');
    if (record.stageLabel !== undefined) {
      const raw = typeof record.stageLabel === 'string' ? record.stageLabel.trim() : '';
      if (!raw) throw new Error('階段名稱不得為空');
      stageLabel = raw;
    }
    if (record.stageDate !== undefined) stageDate = parseStageDate(record.stageDate);
    if (record.progressStatus !== undefined) progressStatus = validateProgressStatus(record.progressStatus);
    if (record.status !== undefined) status = parseContentStatus(record.status);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  const summary = record.summary !== undefined
    ? (typeof record.summary === 'string' ? record.summary.trim() || null : null)
    : undefined;
  const content = record.content !== undefined
    ? (typeof record.content === 'string' ? record.content.trim() || null : null)
    : undefined;

  let sortOrder: number | undefined;
  if (record.sortOrder !== undefined) {
    const value = record.sortOrder === null || record.sortOrder === '' ? 0 : Number(record.sortOrder);
    if (!Number.isInteger(value)) {
      return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
    }
    sortOrder = value;
  }

  const nextStatus = status ?? existing.status;
  const nextProgressStatus = progressStatus ?? existing.progressStatus;
  let publishedAt: Date | null | undefined;
  if (status !== undefined) {
    if (nextStatus === 'published') {
      publishedAt = existing.publishedAt ?? new Date();
    } else {
      publishedAt = null;
    }
  }

  const needDemote = nextStatus === 'published' && nextProgressStatus === 'current';

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (needDemote) {
        await tx.progressItem.updateMany({
          where: {
            siteId: context.site.id,
            status: 'published',
            progressStatus: 'current',
            id: { not: itemId },
          },
          data: { progressStatus: 'completed' },
        });
      }
      return tx.progressItem.update({
        where: { id: itemId },
        data: {
          title,
          stageLabel,
          stageDate,
          summary,
          content,
          progressStatus,
          status,
          sortOrder,
          ...(publishedAt !== undefined ? { publishedAt } : {}),
        },
      });
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'delete');
  const itemId = parseId(id);
  if (itemId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.progressItem.findFirst({
    where: { id: itemId, siteId: context.site.id },
  });
  if (!existing) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.contentAttachment.deleteMany({
        where: { siteId: context.site.id, ownerType: 'progress', ownerId: itemId },
      });
      await tx.progressItem.delete({ where: { id: itemId } });
    });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
