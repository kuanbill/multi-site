import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { readJsonBody, readSortOrder, readContentStatus } from '@/lib/adminValidation';
import { validateRequiredText } from '@/lib/contentValidation';
import { generateRandomSlug } from '@/lib/slug';

type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');

  const items = await prisma.announcement.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
  });
  return NextResponse.json(items);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');

  const record = await readJsonBody(request);
  if (!record) {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  let title: string;
  let status: string;
  try {
    title = validateRequiredText(record.title, 'title');
    status = readContentStatus(record);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  const summary = typeof record.summary === 'string' ? record.summary.trim() || null : null;
  const content = typeof record.content === 'string' ? record.content.trim() || null : null;
  const category = typeof record.category === 'string' ? record.category.trim() || null : null;
  const pinned = Boolean(record.pinned);
  const sortOrder = readSortOrder(record);
  if (!Number.isInteger(sortOrder)) {
    return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
  }

  let slug = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateRandomSlug();
    const existing = await prisma.announcement.findUnique({
      where: { siteId_slug: { siteId: context.site.id, slug: candidate } },
    });
    if (!existing) {
      slug = candidate;
      break;
    }
  }
  if (!slug) {
    return NextResponse.json({ error: '建立失敗' }, { status: 500 });
  }

  const publishedAt = status === 'published' ? new Date() : null;

  try {
    const created = await prisma.announcement.create({
      data: {
        siteId: context.site.id,
        title,
        slug,
        summary,
        content,
        category,
        pinned,
        status,
        sortOrder,
        publishedAt,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立失敗' }, { status: 500 });
  }
}
