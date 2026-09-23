import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { parseContentStatus, validateRequiredText } from '@/lib/contentValidation';

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
  const vendorId = parseId(id);
  if (vendorId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }
  const item = await prisma.vendor.findFirst({
    where: { id: vendorId, siteId: context.site.id },
    include: { logoMedia: true },
  });
  if (!item) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  }
  const attachments = await prisma.contentAttachment.findMany({
    where: { siteId: context.site.id, ownerType: 'vendor', ownerId: vendorId },
    include: { media: true },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json({ ...item, attachments });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const vendorId = parseId(id);
  if (vendorId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.vendor.findFirst({
    where: { id: vendorId, siteId: context.site.id },
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

  let name: string | undefined;
  let category: string | undefined;
  let status: string | undefined;
  let attachmentIds: number[] | undefined;
  try {
    if (record.name !== undefined) name = validateRequiredText(record.name, 'name');
    if (record.category !== undefined) {
      const raw = typeof record.category === 'string' ? record.category.trim() : '';
      if (!raw) throw new Error('分類不得為空');
      category = raw;
    }
    if (record.status !== undefined) status = parseContentStatus(record.status);
    if (record.attachmentIds !== undefined || record.attachments !== undefined || record.mediaIds !== undefined) {
      attachmentIds = parseAttachmentIds(record.attachmentIds ?? record.attachments ?? record.mediaIds);
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  const summary = record.summary !== undefined
    ? (typeof record.summary === 'string' ? record.summary.trim() || null : null)
    : undefined;
  const description = record.description !== undefined
    ? (typeof record.description === 'string' ? record.description.trim() || null : null)
    : undefined;
  const services = record.services !== undefined
    ? (typeof record.services === 'string' ? record.services.trim() || null : null)
    : undefined;
  const contactName = record.contactName !== undefined
    ? (typeof record.contactName === 'string' ? record.contactName.trim() || null : null)
    : undefined;
  const contactPhone = record.contactPhone !== undefined
    ? (typeof record.contactPhone === 'string' ? record.contactPhone.trim() || null : null)
    : undefined;
  let contactEmail: string | null | undefined;
  if (record.contactEmail !== undefined) {
    const val = typeof record.contactEmail === 'string' ? record.contactEmail.trim() || null : null;
    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      return NextResponse.json({ error: '聯絡電子郵件格式無效' }, { status: 400 });
    }
    contactEmail = val;
  }

  let sortOrder: number | undefined;
  if (record.sortOrder !== undefined) {
    const value = record.sortOrder === null || record.sortOrder === '' ? 0 : Number(record.sortOrder);
    if (!Number.isInteger(value)) {
      return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
    }
    sortOrder = value;
  }

  let logoMediaId: number | null | undefined;
  if (record.logoMediaId !== undefined || record.logoUrl !== undefined) {
    if (record.logoMediaId === null || record.logoMediaId === '') {
      logoMediaId = null;
    } else if (record.logoMediaId !== undefined) {
      const number = typeof record.logoMediaId === 'number' ? record.logoMediaId : Number(record.logoMediaId);
      if (!Number.isInteger(number) || number < 1) {
        return NextResponse.json({ error: 'Logo 編號格式無效' }, { status: 400 });
      }
      const media = await prisma.media.findFirst({ where: { id: number, siteId: context.site.id } });
      if (!media) {
        return NextResponse.json({ error: 'Logo 不存在或不屬於此站點' }, { status: 400 });
      }
      logoMediaId = number;
    } else if (typeof record.logoUrl === 'string' && record.logoUrl.trim()) {
      const media = await prisma.media.findFirst({ where: { siteId: context.site.id, url: record.logoUrl.trim() } });
      if (!media) {
        return NextResponse.json({ error: 'Logo 不存在或不屬於此站點' }, { status: 400 });
      }
      logoMediaId = media.id;
    } else if (record.logoUrl === null || record.logoUrl === '') {
      logoMediaId = null;
    }
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
      const vendor = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          name,
          category,
          summary,
          description,
          services,
          contactName,
          contactPhone,
          contactEmail,
          logoMediaId,
          status,
          sortOrder,
          ...(publishedAt !== undefined ? { publishedAt } : {}),
        },
      });

      if (attachmentIds !== undefined) {
        await tx.contentAttachment.deleteMany({
          where: { siteId: context.site.id, ownerType: 'vendor', ownerId: vendorId },
        });
        if (attachmentIds.length > 0) {
          await tx.contentAttachment.createMany({
            data: attachmentIds.map((mediaId, index) => ({
              siteId: context.site.id,
              mediaId,
              ownerType: 'vendor',
              ownerId: vendorId,
              sortOrder: index,
            })),
          });
        }
      }

      return vendor;
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, id } = await params;
  const context = await requireContentPermission(siteSlug, 'delete');
  const vendorId = parseId(id);
  if (vendorId === null) {
    return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.vendor.findFirst({
    where: { id: vendorId, siteId: context.site.id },
  });
  if (!existing) {
    return NextResponse.json({ error: '找不到資料' }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.contentAttachment.deleteMany({
        where: { siteId: context.site.id, ownerType: 'vendor', ownerId: vendorId },
      });
      await tx.vendor.delete({ where: { id: vendorId } });
    });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
