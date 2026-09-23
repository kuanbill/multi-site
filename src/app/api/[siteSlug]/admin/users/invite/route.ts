import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 });
  const site = await prisma.site.findUnique({ where: { slug: siteSlug } });
  if (!site) return NextResponse.json({ error: '找不到專案' }, { status: 404 });
  const isGlobalAdmin = session.user.role === 'admin';
  const membership = session.user.siteRoles?.find((r) => r.slug === siteSlug);
  const canInvite = isGlobalAdmin || membership?.role === 'admin';
  if (!canInvite) return NextResponse.json({ error: '只有站點管理員可邀請' }, { status: 403 });

  try {
    const body = await req.json();
    const emailRaw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const role = ['admin', 'editor', 'viewer'].includes(body.role) ? body.role : 'editor';
    const passwordRaw = typeof body.password === 'string' ? body.password : '';

    if (!emailRaw || !name) return NextResponse.json({ error: 'email 與姓名為必填' }, { status: 400 });

    // 一人一站約束 (全域 admin 例外)
    let user = await prisma.user.findUnique({ where: { email: emailRaw } });
    if (user) {
      const existingCount = await prisma.siteUser.count({ where: { userId: user.id } });
      const isTargetAdmin = user.role === 'admin';
      if (existingCount >= 1 && !isTargetAdmin) {
        // 檢查是否已在該站
        const already = await prisma.siteUser.findFirst({ where: { userId: user.id, siteId: site.id } });
        if (already) return NextResponse.json({ error: '使用者已在該專案' }, { status: 409 });
        // 若使用者已屬於其他站且非 admin，拒絕
        return NextResponse.json({ error: '此帳號已屬於其他專案，站點獨立帳號不可重複' }, { status: 409 });
      }
      // 已存在使用者，僅建立關聯
      const existingLink = await prisma.siteUser.findFirst({ where: { userId: user.id, siteId: site.id } });
      if (existingLink) return NextResponse.json({ error: '已在該專案' }, { status: 409 });
      const link = await prisma.siteUser.create({ data: { userId: user.id, siteId: site.id, role } });
      return NextResponse.json({ user, link }, { status: 201 });
    }

    // 新使用者
    const password = passwordRaw || Math.random().toString(36).slice(-8) + 'A1!';
    if (password.length < 6) return NextResponse.json({ error: '密碼至少 6 字元' }, { status: 400 });
    const hashed = await hash(password, 12);
    user = await prisma.user.create({
      data: { email: emailRaw, name, password: hashed, role: role === 'admin' ? 'editor' : 'editor' },
    });
    const link = await prisma.siteUser.create({ data: { userId: user.id, siteId: site.id, role } });

    // MVP: 回傳明文密碼供管理員轉告 (後續應寄信)
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name }, link, tempPassword: password }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: '邀請失敗' }, { status: 500 });
  }
}
