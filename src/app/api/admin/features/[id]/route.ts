import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { isReservedFeaturePath, validateCustomFeaturePath } from '@/lib/featureEntryValidation';

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
      const isLegacyPageFeature = existing.key === 'pages' || existing.key === 'posts';
      if (isLegacyPageFeature && path !== existing.path) {
        return NextResponse.json({ error: 'pages/posts 功能路徑固定不可修改' }, { status: 400 });
      }
      if (!isLegacyPageFeature) {
        try {
          validateCustomFeaturePath(path);
        } catch {
          if (isReservedFeaturePath(path)) {
            return NextResponse.json({ error: '此路徑為系統保留，請更換其他路徑' }, { status: 409 });
          }
          return NextResponse.json({ error: '路徑僅允許小寫英文、數字、底線與連字號' }, { status: 400 });
        }
      }
      const duplicate = await prisma.featureDefinition.findFirst({
        where: { id: { not: featureId }, OR: [{ key: path }, { path }] },
        select: { id: true },
      });
      if (duplicate) return NextResponse.json({ error: '此路徑已存在，請使用其他路徑' }, { status: 409 });
      data.key = path;
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
  if (isNaN(featureId)) return NextResponse.json({ error: '無效 id' }, { status: 400 });
  const existing = await prisma.featureDefinition.findUnique({ where: { id: featureId } });
  if (!existing) return NextResponse.json({ error: '找不到功能' }, { status: 404 });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.siteFeature.deleteMany({ where: { featureId } });
      if (existing.key === 'pages') await tx.page.deleteMany({ where: {} });
      if (existing.key === 'posts') await tx.post.deleteMany({ where: {} });
      await tx.featureDefinition.delete({ where: { id: featureId } });
    });
    return NextResponse.json({ message: '已刪除' });
  } catch {
    return NextResponse.json({ error: '刪除失敗' }, { status: 500 });
  }
}
