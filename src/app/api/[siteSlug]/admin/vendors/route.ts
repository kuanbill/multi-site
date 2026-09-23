import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { parseContentStatus, validateRequiredText } from '@/lib/contentValidation';

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
  const items = await prisma.vendor.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    include: { logoMedia: true },
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

  let name: string;
  let category: string;
  let status: string;
  let attachmentIds: number[] | undefined;
  try {
    name = validateRequiredText(record.name, 'name');
    const rawCategory = typeof record.category === 'string' ? record.category.trim() : '';
    if (!rawCategory) throw new Error('分類不得為空');
    category = rawCategory;
    status = record.status === undefined || record.status === null || record.status === ''
      ? 'draft'
      : parseContentStatus(record.status);
    attachmentIds = parseAttachmentIds(record.attachmentIds ?? record.attachments ?? record.mediaIds);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  const summary = typeof record.summary === 'string' ? record.summary.trim() || null : null;
  const description = typeof record.description === 'string' ? record.description.trim() || null : null;
  const services = typeof record.services === 'string' ? record.services.trim() || null : null;
  const contactName = typeof record.contactName === 'string' ? record.contactName.trim() || null : null;
  const contactPhone = typeof record.contactPhone === 'string' ? record.contactPhone.trim() || null : null;
  const contactEmail = typeof record.contactEmail === 'string' ? record.contactEmail.trim() || null : null;
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: '聯絡電子郵件格式無效' }, { status: 400 });
  }
  const sortOrder = record.sortOrder === undefined || record.sortOrder === null || record.sortOrder === ''
    ? 0
    : Number(record.sortOrder);
  if (!Number.isInteger(sortOrder)) {
    return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
  }

  let logoMediaId: number | null = null;
  if (record.logoMediaId !== undefined && record.logoMediaId !== null && record.logoMediaId !== '') {
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
      const vendor = await tx.vendor.create({
        data: {
          siteId: context.site.id,
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
          publishedAt,
        },
      });
      if (attachmentIds && attachmentIds.length > 0) {
        await tx.contentAttachment.createMany({
          data: attachmentIds.map((mediaId, index) => ({
            siteId: context.site.id,
            mediaId,
            ownerType: 'vendor',
            ownerId: vendor.id,
            sortOrder: index,
          })),
        });
      }
      return vendor;
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立失敗' }, { status: 500 });
  }
}
