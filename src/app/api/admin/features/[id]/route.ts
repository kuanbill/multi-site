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
  try {
    const body = await req.json();
    const label = typeof body.label === 'string' ? body.label.trim() : existing.label;
    const icon = typeof body.icon === 'string' ? body.icon.trim() : existing.icon;
    const path = typeof body.path === 'string' ? body.path.trim() : existing.path;
    const description = typeof body.description === 'string' ? body.description.trim() : existing.description;
    const displayModeRaw = typeof body.displayMode === 'string' ? body.displayMode.trim() : existing.displayMode;
    const displayMode = ['list', 'card', 'grid'].includes(displayModeRaw) ? displayModeRaw : existing.displayMode;
    if (!label || !path) return NextResponse.json({ error: '名稱與路徑為必填' }, { status: 400 });
    // 系統功能不允許修改 key/path，僅允許 label/icon/displayMode
    const data: Record<string, unknown> = { label, icon: icon || null, description: description || null, displayMode };
    if (!existing.isSystem) {
      data.path = path;
    }
    const updated = await prisma.featureDefinition.update({
      where: { id: featureId },
      data,
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
