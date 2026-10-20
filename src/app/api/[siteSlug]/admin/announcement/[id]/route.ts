import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { validateRequiredText } from '@/lib/contentValidation';
import { readJsonBody, parseId, readSortOrder, readContentStatus } from '@/lib/adminValidation';
import {
  GOOGLE_DRIVE_LINK_ERROR,
  parseGoogleDriveUrls,
  readContentExternalLinks,
  syncContentExternalLinks,
} from '@/lib/contentExternalLinks';

type RouteContext = { params: Promise<{ siteSlug: string; id: string }> };

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
  const links = await readContentExternalLinks(prisma, {
    siteId: context.site.id,
    ownerType: 'announcement',
    ownerId: announcementId,
  });
  return NextResponse.json({ ...item, driveUrls: links.map((link) => link.url) });
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

  const record = await readJsonBody(request);
  if (!record) {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  let title: string | undefined;
  let status: string | undefined;
  try {
    if (record.title !== undefined) title = validateRequiredText(record.title, 'title');
    if (record.status !== undefined) status = readContentStatus(record);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
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
  const sortOrder = record.sortOrder !== undefined ? readSortOrder(record) : undefined;
  if (sortOrder !== undefined && !Number.isInteger(sortOrder)) {
    return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
  }

  let driveUrls: string[] | undefined;
  if (record.driveUrls !== undefined) {
    try {
      driveUrls = parseGoogleDriveUrls(record.driveUrls);
    } catch {
      return NextResponse.json({ error: GOOGLE_DRIVE_LINK_ERROR }, { status: 400 });
    }
  }

  const nextStatus = status ?? existing.status;
  const publishedAt = status !== undefined ? (nextStatus === 'published' ? (existing.publishedAt ?? new Date()) : null) : undefined;

  const data = {
    title,
    summary,
    content,
    category,
    pinned,
    status,
    sortOrder,
    ...(publishedAt !== undefined ? { publishedAt } : {}),
  };

  try {
    const updated = driveUrls === undefined
      ? await prisma.announcement.update({ where: { id: announcementId }, data })
      : await prisma.$transaction(async (tx) => {
          const item = await tx.announcement.update({ where: { id: announcementId }, data });
          await syncContentExternalLinks(tx, {
            siteId: context.site.id,
            ownerType: 'announcement',
            ownerId: announcementId,
            urls: driveUrls,
          });
          return item;
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
      await tx.contentExternalLink.deleteMany({
        where: { siteId: context.site.id, ownerType: 'announcement', ownerId: announcementId },
      });
      await tx.announcement.delete({ where: { id: announcementId } });
    });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
