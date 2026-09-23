import { NextResponse } from 'next/server';
import { requireContentPermission } from '@/lib/contentAccess';
import { parseContentStatus, validateRequiredText } from '@/lib/contentValidation';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ siteSlug: string }> };
async function mediaId(value: unknown, siteId: number) {
  if (value === undefined || value === null || value === '') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || !await prisma.media.findFirst({ where: { id, siteId } })) throw new Error('媒體不存在或不屬於此站點');
  return id;
}
function parse(body: Record<string, unknown>) {
  const title = validateRequiredText(body.title, 'title');
  const status = body.status === undefined ? 'draft' : parseContentStatus(body.status);
  const sortOrder = body.sortOrder === undefined || body.sortOrder === '' ? 0 : Number(body.sortOrder);
  if (!Number.isInteger(sortOrder)) throw new Error('排序參數錯誤');
  return { title, category: typeof body.category === 'string' ? body.category.trim() || null : null, description: typeof body.description === 'string' ? body.description.trim() || null : null, status, sortOrder, publishedAt: status === 'published' ? new Date() : null };
}
export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params; const context = await requireContentPermission(siteSlug, 'read');
  return NextResponse.json(await prisma.mapAsset.findMany({ where: { siteId: context.site.id }, include: { imageMedia: true, downloadMedia: true }, orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }] }));
}
export async function POST(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params; const context = await requireContentPermission(siteSlug, 'write');
  let body: Record<string, unknown>; try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 }); }
  try {
    const values = parse(body); const imageMediaId = await mediaId(body.imageMediaId, context.site.id); const downloadMediaId = await mediaId(body.downloadMediaId, context.site.id);
    if (imageMediaId === null && downloadMediaId === null) throw new Error('請提供地圖圖片或下載檔案');
    return NextResponse.json(await prisma.mapAsset.create({ data: { siteId: context.site.id, ...values, imageMediaId, downloadMediaId }, include: { imageMedia: true, downloadMedia: true } }), { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '建立失敗' }, { status: 400 }); }
}
