import { NextResponse } from 'next/server';
import { requireContentPermission } from '@/lib/contentAccess';
import { validateRequiredText } from '@/lib/contentValidation';
import { prisma } from '@/lib/prisma';
import { isFeatureEnabled } from '@/lib/site';

type RouteContext = { params: Promise<{ siteSlug: string; id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug, id: rawId } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  if (!(await isFeatureEnabled(context.site.id, 'pages'))) return NextResponse.json({ error: '此功能未啟用' }, { status: 404 });

  const id = parseId(rawId);
  if (id === null) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  const current = await prisma.page.findFirst({ where: { id, siteId: context.site.id } });
  if (!current) return NextResponse.json({ error: '找不到頁面' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });

  let title: string;
  const slug = body.slug === undefined ? current.slug : typeof body.slug === 'string' ? body.slug.trim() : '';
  try {
    title = body.title === undefined ? current.title : validateRequiredText(body.title, 'title');
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }
  if (!slug) return NextResponse.json({ error: 'Slug 不得為空' }, { status: 400 });
  if (body.content !== undefined && body.content !== null && typeof body.content !== 'string') {
    return NextResponse.json({ error: '內文格式無效' }, { status: 400 });
  }
  const content = body.content === undefined ? current.content : typeof body.content === 'string' ? body.content : null;

  if (slug !== current.slug) {
    const duplicate = await prisma.page.findFirst({ where: { siteId: context.site.id, slug, id: { not: id } } });
    if (duplicate) return NextResponse.json({ error: '此 slug 已存在' }, { status: 409 });
  }

  try {
    const page = await prisma.page.update({ where: { id }, data: { title, slug, content } });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { siteSlug, id: rawId } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  if (!(await isFeatureEnabled(context.site.id, 'pages'))) return NextResponse.json({ error: '此功能未啟用' }, { status: 404 });

  const id = parseId(rawId);
  if (id === null) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });
  const current = await prisma.page.findFirst({ where: { id, siteId: context.site.id } });
  if (!current) return NextResponse.json({ error: '找不到頁面' }, { status: 404 });

  try {
    await prisma.page.delete({ where: { id } });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
