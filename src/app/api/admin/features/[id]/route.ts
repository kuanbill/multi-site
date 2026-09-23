import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: '只有管理員可以管理功能' }, { status: 403 });
  const { id } = await params;
  const featureId = parseInt(id);
  if (isNaN(featureId)) return NextResponse.json({ error: '無效 id' }, { status: 400 });
  const existing = await prisma.featureDefinition.findUnique({ where: { id: featureId } });
  if (!existing) return NextResponse.json({ error: '找不到功能' }, { status: 404 });
  if (existing.isSystem) return NextResponse.json({ error: '系統功能不可編輯' }, { status: 403 });
  try {
    const body = await req.json();
    const label = typeof body.label === 'string' ? body.label.trim() : existing.label;
    const icon = typeof body.icon === 'string' ? body.icon.trim() : existing.icon;
    const path = typeof body.path === 'string' ? body.path.trim() : existing.path;
    const description = typeof body.description === 'string' ? body.description.trim() : existing.description;
    if (!label || !path) return NextResponse.json({ error: '名稱與路徑為必填' }, { status: 400 });
    const updated = await prisma.featureDefinition.update({
      where: { id: featureId },
      data: { label, icon: icon || null, path, description: description || null },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: '只有管理員可以管理功能' }, { status: 403 });
  const { id } = await params;
  const featureId = parseInt(id);
  const existing = await prisma.featureDefinition.findUnique({ where: { id: featureId } });
  if (!existing) return NextResponse.json({ error: '找不到功能' }, { status: 404 });
  if (existing.isSystem) return NextResponse.json({ error: '系統功能不可刪除' }, { status: 403 });
  try {
    await prisma.siteFeature.deleteMany({ where: { featureId } });
    await prisma.featureDefinition.delete({ where: { id: featureId } });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
