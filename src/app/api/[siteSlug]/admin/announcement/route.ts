import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission, requireSiteContext } from '@/lib/contentAccess';
import { parseContentStatus, validateRequiredText, validateSlug } from '@/lib/contentValidation';

type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireSiteContext(siteSlug);
  // read permission check via site context; any site member can read
  if (context.siteRole === 'viewer' || context.siteRole === 'editor' || context.siteRole === 'admin' || context.siteRole === 'global-admin') {
    // allowed
  } else {
    // requireSiteContext already ensures membership
  }

  const items = await prisma.announcement.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ pinned: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
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
  try {
    title = validateRequiredText(record.title, 'title');
    slug = validateSlug(record.slug);
    status = record.status === undefined || record.status === null || record.status === ''
      ? 'draft'
      : parseContentStatus(record.status);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  const summary = typeof record.summary === 'string' ? record.summary.trim() || null : null;
  const content = typeof record.content === 'string' ? record.content.trim() || null : null;
  const category = typeof record.category === 'string' ? record.category.trim() || null : null;
  const pinned = Boolean(record.pinned);
  const sortOrder = record.sortOrder === undefined || record.sortOrder === null || record.sortOrder === ''
    ? 0
    : Number(record.sortOrder);
  if (!Number.isInteger(sortOrder)) {
    return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
  }

  const existing = await prisma.announcement.findUnique({
    where: { siteId_slug: { siteId: context.site.id, slug } },
  });
  if (existing) {
    return NextResponse.json({ error: '識別碼已存在' }, { status: 409 });
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
