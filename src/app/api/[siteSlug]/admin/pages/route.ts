import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isFeatureEnabled } from '@/lib/site';

export async function GET(_req: Request, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 });
  const site = await prisma.site.findUnique({ where: { slug: siteSlug } });
  if (!site) return NextResponse.json({ error: '找不到專案' }, { status: 404 });
  if (!(await isFeatureEnabled(site.id, 'pages'))) return NextResponse.json({ error: '此功能未啟用' }, { status: 403 });
  const isAdmin = session.user.role === 'admin';
  const has = isAdmin || session.user.siteRoles?.some((r) => r.slug === siteSlug);
  if (!has) return NextResponse.json({ error: '無權限' }, { status: 403 });
  const pages = await prisma.page.findMany({ where: { siteId: site.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(pages);
}

export async function POST(req: Request, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 });
  const site = await prisma.site.findUnique({ where: { slug: siteSlug } });
  if (!site) return NextResponse.json({ error: '找不到專案' }, { status: 404 });
  if (!(await isFeatureEnabled(site.id, 'pages'))) return NextResponse.json({ error: '此功能未啟用' }, { status: 403 });
  const isAdmin = session.user.role === 'admin';
  const has = isAdmin || session.user.siteRoles?.some((r) => r.slug === siteSlug);
  if (!has) return NextResponse.json({ error: '無權限' }, { status: 403 });
  try {
    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const content = typeof body.content === 'string' ? body.content : null;
    if (!title || !slug) return NextResponse.json({ error: '標題與 slug 為必填' }, { status: 400 });
    const existing = await prisma.page.findFirst({ where: { siteId: site.id, slug } });
    if (existing) return NextResponse.json({ error: '此 slug 已存在' }, { status: 409 });
    const page = await prisma.page.create({ data: { siteId: site.id, title, slug, content } });
    return NextResponse.json(page, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立失敗' }, { status: 500 });
  }
}
