import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const SITE_ROLES = ['admin', 'editor', 'viewer'] as const;

type SiteRole = (typeof SITE_ROLES)[number];

function isSiteRole(value: unknown): value is SiteRole {
  return typeof value === 'string' && (SITE_ROLES as readonly string[]).includes(value);
}

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

export async function PUT(req: Request, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 });
  const site = await prisma.site.findUnique({ where: { slug: siteSlug } });
  if (!site) return NextResponse.json({ error: '找不到專案' }, { status: 404 });
  const isGlobalAdmin = session.user.role === 'admin';
  const membership = session.user.siteRoles?.find((r) => r.slug === siteSlug);
  if (!isGlobalAdmin && membership?.role !== 'admin') {
    return NextResponse.json({ error: '只有站點管理員可修改成員' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const userId = typeof body.userId === 'number' ? body.userId : Number.parseInt(String(body.userId), 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '缺少 userId' }, { status: 400 });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!name || !email) return NextResponse.json({ error: '姓名與 Email 為必填' }, { status: 400 });
    if (!isSiteRole(body.role)) return NextResponse.json({ error: '無效的站內角色' }, { status: 400 });
    if (password && password.length < 6) {
      return NextResponse.json({ error: '密碼至少 6 字元' }, { status: 400 });
    }

    const target = await prisma.siteUser.findFirst({ where: { siteId: site.id, userId } });
    if (!target) return NextResponse.json({ error: '找不到該成員' }, { status: 404 });

    const duplicated = await prisma.user.findFirst({ where: { email, id: { not: userId } } });
    if (duplicated) return NextResponse.json({ error: '此電子郵件已被註冊' }, { status: 409 });

    if (target.role === 'admin' && body.role !== 'admin') {
      const adminCount = await prisma.siteUser.count({ where: { siteId: site.id, role: 'admin' } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: '無法降低最後一位站點管理員' }, { status: 400 });
      }
    }

    const userData: { name: string; email: string; password?: string } = { name, email };
    if (password) userData.password = await hash(password, 12);

    const [user, link] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: userData,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.siteUser.update({
        where: { userId_siteId: { userId, siteId: site.id } },
        data: { role: body.role },
        select: { id: true, role: true },
      }),
    ]);

    return NextResponse.json({ siteRole: link.role, siteUserId: link.id, user });
  } catch {
    return NextResponse.json({ error: '更新成員失敗' }, { status: 500 });
  }
}
