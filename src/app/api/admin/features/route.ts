import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { isReservedFeaturePath } from '@/lib/featureEntryValidation';

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: '只有管理員可以管理功能' }, { status: 403 });
  }
  const features = await prisma.featureDefinition.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(features);
}

export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: '只有管理員可以管理功能' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const icon = typeof body.icon === 'string' ? body.icon.trim() : null;
    const path = typeof body.path === 'string' ? body.path.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    const displayModeRaw = typeof body.displayMode === 'string' ? body.displayMode.trim() : 'list';
    const displayMode = ['list', 'card', 'grid'].includes(displayModeRaw) ? displayModeRaw : 'list';

    if (!label || !path) {
      return NextResponse.json({ error: '名稱與路徑為必填' }, { status: 400 });
    }
    if (!/^[a-z0-9_-]+$/.test(path)) {
      return NextResponse.json({ error: '路徑僅允許小寫英文、數字、底線與連字號' }, { status: 400 });
    }
    if (isReservedFeaturePath(path)) {
      return NextResponse.json({ error: '此路徑為系統保留，請更換其他路徑' }, { status: 409 });
    }

    const existing = await prisma.featureDefinition.findFirst({
      where: { OR: [{ key: path }, { path }] },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ error: '此路徑已存在，請使用其他路徑' }, { status: 409 });

    const feature = await prisma.featureDefinition.create({
      data: { key: path, label, icon, path, description, isSystem: false, displayMode },
    });
    return NextResponse.json(feature, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立功能失敗' }, { status: 500 });
  }
}
