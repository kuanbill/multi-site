import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { validateRequiredText } from '@/lib/contentValidation';
import { isFeatureEnabled } from '@/lib/site';

type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  if (!(await isFeatureEnabled(context.site.id, 'pages'))) return NextResponse.json({ error: '此功能未啟用' }, { status: 404 });
  const pages = await prisma.page.findMany({ where: { siteId: context.site.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(pages);
}

export async function POST(req: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  if (!(await isFeatureEnabled(context.site.id, 'pages'))) return NextResponse.json({ error: '此功能未啟用' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  const record = isRecord(body) ? body : {};
  let title: string;
  const slug = typeof record.slug === 'string' ? record.slug.trim() : '';
  try {
    title = validateRequiredText(record.title, 'title');
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }
  if (!slug) return NextResponse.json({ error: '標題與 slug 為必填' }, { status: 400 });
  if (record.content !== undefined && record.content !== null && typeof record.content !== 'string') {
    return NextResponse.json({ error: '內文格式無效' }, { status: 400 });
  }
  const content = typeof record.content === 'string' ? record.content : null;
  const existing = await prisma.page.findFirst({ where: { siteId: context.site.id, slug } });
  if (existing) return NextResponse.json({ error: '此 slug 已存在' }, { status: 409 });

  try {
    const page = await prisma.page.create({ data: { siteId: context.site.id, title, slug, content } });
    return NextResponse.json(page, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立失敗' }, { status: 500 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
