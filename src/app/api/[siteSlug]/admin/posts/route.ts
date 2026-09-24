import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { validateRequiredText } from '@/lib/contentValidation';
import { isFeatureEnabled } from '@/lib/site';

type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  if (!(await isFeatureEnabled(context.site.id, 'posts'))) return NextResponse.json({ error: '此功能未啟用' }, { status: 404 });
  const posts = await prisma.post.findMany({ where: { siteId: context.site.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(posts);
}

export async function POST(req: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  if (!(await isFeatureEnabled(context.site.id, 'posts'))) return NextResponse.json({ error: '此功能未啟用' }, { status: 404 });

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
  if (record.published !== undefined && typeof record.published !== 'boolean') {
    return NextResponse.json({ error: '發布狀態格式無效' }, { status: 400 });
  }
  const content = typeof record.content === 'string' ? record.content : null;
  const published = record.published === true;
  const existing = await prisma.post.findFirst({ where: { siteId: context.site.id, slug } });
  if (existing) return NextResponse.json({ error: '此 slug 已存在' }, { status: 409 });

  try {
    const post = await prisma.post.create({ data: { siteId: context.site.id, title, slug, content, published } });
    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立失敗' }, { status: 500 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
