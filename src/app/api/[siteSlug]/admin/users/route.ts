import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(_req: Request, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 });
  const site = await prisma.site.findUnique({ where: { slug: siteSlug } });
  if (!site) return NextResponse.json({ error: '找不到專案' }, { status: 404 });
  const isAdmin = session.user.role === 'admin';
  const has = isAdmin || session.user.siteRoles?.some((r) => r.slug === siteSlug);
  if (!has) return NextResponse.json({ error: '無權限' }, { status: 403 });

  const members = await prisma.siteUser.findMany({
    where: { siteId: site.id },
    include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const result = members.map((m) => ({
    siteRole: m.role,
    user: m.user,
    siteUserId: m.id,
  }));
  return NextResponse.json(result);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 });
  const site = await prisma.site.findUnique({ where: { slug: siteSlug } });
  if (!site) return NextResponse.json({ error: '找不到專案' }, { status: 404 });
  const isGlobalAdmin = session.user.role === 'admin';
  const membership = session.user.siteRoles?.find((r) => r.slug === siteSlug);
  if (!isGlobalAdmin && membership?.role !== 'admin') return NextResponse.json({ error: '只有站點管理員可移除' }, { status: 403 });
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 });
  await prisma.siteUser.deleteMany({ where: { siteId: site.id, userId: parseInt(userId) } });
  return NextResponse.json({ message: '已移除' });
}
