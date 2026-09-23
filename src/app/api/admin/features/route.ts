import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

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
    const keyRaw = typeof body.key === 'string' ? body.key.trim().toLowerCase() : '';
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const icon = typeof body.icon === 'string' ? body.icon.trim() : null;
    const path = typeof body.path === 'string' ? body.path.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : null;
    const displayModeRaw = typeof body.displayMode === 'string' ? body.displayMode.trim() : 'list';
    const displayMode = ['list', 'card', 'grid'].includes(displayModeRaw) ? displayModeRaw : 'list';

    if (!label || !path) {
      return NextResponse.json({ error: '名稱與路徑為必填' }, { status: 400 });
    }
    const key = keyRaw || label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!key) return NextResponse.json({ error: '無法產生 key' }, { status: 400 });
    if (!/^[a-z0-9_]+$/.test(key)) return NextResponse.json({ error: 'key 僅允許小寫英文、數字與底線' }, { status: 400 });

    const existing = await prisma.featureDefinition.findUnique({ where: { key } });
    if (existing) return NextResponse.json({ error: '此 key 已存在' }, { status: 409 });

    const feature = await prisma.featureDefinition.create({
      data: { key, label, icon, path, description, isSystem: false, displayMode },
    });
    return NextResponse.json(feature, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立功能失敗' }, { status: 500 });
  }
}
