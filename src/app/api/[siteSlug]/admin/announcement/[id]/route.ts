import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { parseContentStatus, validateRequiredText, validateSlug } from '@/lib/contentValidation';

type RouteContext = { params: Promise<{ siteSlug: string; id: string }> };

function parseId(value: string): number | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return null;
  return number;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const announcementId = parseId(id);
  if (announcementId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const item = await prisma.announcement.findFirst({
    where: { id: announcementId, siteId: context.site.id },
  });
  if (!item) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const announcementId = parseId(id);
  if (announcementId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.announcement.findFirst({
    where: { id: announcementId, siteId: context.site.id },
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
  try {
    if (record.title !== undefined) title = validateRequiredText(record.title, 'title');
    if (record.slug !== undefined) slug = validateSlug(record.slug);
    if (record.status !== undefined) status = parseContentStatus(record.status);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  if (slug && slug !== existing.slug) {
    const duplicate = await prisma.announcement.findUnique({
      where: { siteId_slug: { siteId: context.site.id, slug } },
    });
    if (duplicate) {
      return NextResponse.json({ error: '識別碼已存在' }, { status: 409 });
    }
  }

  const summary = record.summary !== undefined
    ? (typeof record.summary === 'string' ? record.summary.trim() || null : null)
    : undefined;
  const content = record.content !== undefined
    ? (typeof record.content === 'string' ? record.content.trim() || null : null)
    : undefined;
  const category = record.category !== undefined
    ? (typeof record.category === 'string' ? record.category.trim() || null : null)
    : undefined;
  const pinned = record.pinned !== undefined ? Boolean(record.pinned) : undefined;
  let sortOrder: number | undefined;
  if (record.sortOrder !== undefined) {
    const value = record.sortOrder === null || record.sortOrder === '' ? 0 : Number(record.sortOrder);
    if (!Number.isInteger(value)) {
      return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
    }
    sortOrder = value;
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
    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title,
        slug,
        summary,
        content,
        category,
        pinned,
        status,
        sortOrder,
        ...(publishedAt !== undefined ? { publishedAt } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'delete');
  const announcementId = parseId(id);
  if (announcementId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.announcement.findFirst({
    where: { id: announcementId, siteId: context.site.id },
  });
  if (!existing) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.contentAttachment.deleteMany({
        where: { siteId: context.site.id, ownerType: 'announcement', ownerId: announcementId },
      });
      await tx.announcement.delete({ where: { id: announcementId } });
    });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
