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

  const definitions = await prisma.featureDefinition.findMany({ orderBy: { createdAt: 'asc' } });
  const siteFeatures = await prisma.siteFeature.findMany({ where: { siteId: site.id } });
  const map = new Map(siteFeatures.map((sf) => [sf.featureId, sf]));
  const merged = definitions.map((def) => ({
    ...def,
    enabled: map.get(def.id)?.enabled ?? false,
    sortOrder: map.get(def.id)?.sortOrder ?? 0,
    displayMode: map.get(def.id)?.displayMode ?? def.displayMode ?? 'list',
  }));
  return NextResponse.json(merged);
}

export async function PUT(req: Request, { params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: '未登入' }, { status: 401 });
  const site = await prisma.site.findUnique({ where: { slug: siteSlug } });
  if (!site) return NextResponse.json({ error: '找不到專案' }, { status: 404 });
  const isAdmin = session.user.role === 'admin';
  const membership = session.user.siteRoles?.find((r) => r.slug === siteSlug);
  const canEdit = isAdmin || membership?.role === 'admin';
  if (!canEdit) return NextResponse.json({ error: '只有站點管理員可設定' }, { status: 403 });

  try {
    const body = await req.json();
    const features = body.features as { featureId: number; enabled: boolean; sortOrder?: number; displayMode?: string }[];
    if (!Array.isArray(features)) return NextResponse.json({ error: '參數錯誤' }, { status: 400 });

    for (const f of features) {
      const dm = typeof f.displayMode === 'string' && ['list', 'card', 'grid'].includes(f.displayMode) ? f.displayMode : 'list';
      await prisma.siteFeature.upsert({
        where: { siteId_featureId: { siteId: site.id, featureId: f.featureId } },
        update: { enabled: !!f.enabled, sortOrder: f.sortOrder ?? 0, displayMode: dm },
        create: { siteId: site.id, featureId: f.featureId, enabled: !!f.enabled, sortOrder: f.sortOrder ?? 0, displayMode: dm },
      });
    }
    return NextResponse.json({ message: '已更新' });
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}
