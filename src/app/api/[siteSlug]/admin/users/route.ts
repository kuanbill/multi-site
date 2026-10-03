import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  canAssignSiteAdmin,
  canManageSiteMembers,
  requireSiteContext,
} from '@/lib/contentAccess';

const SITE_ROLES = ['admin', 'editor', 'viewer'] as const;

type SiteRole = (typeof SITE_ROLES)[number];

function isSiteRole(value: unknown): value is SiteRole {
  return typeof value === 'string' && (SITE_ROLES as readonly string[]).includes(value);
}

function memberManageDenied() {
  return NextResponse.json({ error: '只有站點管理員或編輯者可管理成員' }, { status: 403 });
}

function siteAdminChangeDenied() {
  return NextResponse.json({ error: '只有站點管理員可變更站點管理員' }, { status: 403 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const { site } = await requireSiteContext(siteSlug);

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
  const { site, siteRole } = await requireSiteContext(siteSlug);
  if (!canManageSiteMembers(siteRole)) return memberManageDenied();

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: '缺少 userId' }, { status: 400 });
  const parsedUserId = Number.parseInt(userId, 10);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    return NextResponse.json({ error: '無效的 userId' }, { status: 400 });
  }

  const target = await prisma.siteUser.findFirst({ where: { siteId: site.id, userId: parsedUserId } });
  if (target?.role === 'admin' && !canAssignSiteAdmin(siteRole)) return siteAdminChangeDenied();

  await prisma.siteUser.deleteMany({ where: { siteId: site.id, userId: parsedUserId } });
  return NextResponse.json({ message: '已移除' });
}

export async function PUT(req: Request, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const { site, siteRole } = await requireSiteContext(siteSlug);
  if (!canManageSiteMembers(siteRole)) return memberManageDenied();

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
    if (body.role === 'admin' && !canAssignSiteAdmin(siteRole)) return siteAdminChangeDenied();

    const target = await prisma.siteUser.findFirst({ where: { siteId: site.id, userId } });
    if (!target) return NextResponse.json({ error: '找不到該成員' }, { status: 404 });
    if (target.role === 'admin' && !canAssignSiteAdmin(siteRole)) return siteAdminChangeDenied();

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