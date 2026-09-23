import { NextResponse } from 'next/server';
import { requireContentPermission } from '@/lib/contentAccess';
import { parseContentStatus, validateExternalUrl, validateRequiredText } from '@/lib/contentValidation';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ siteSlug: string }> };
export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  return NextResponse.json(await prisma.selectionInfo.findUnique({ where: { siteId: context.site.id } }));
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 }); }
  let title: string; let externalUrl: string | null; let status: string;
  try {
    title = validateRequiredText(body.title, 'title');
    externalUrl = validateExternalUrl(body.externalUrl);
    status = body.status === undefined ? 'draft' : parseContentStatus(body.status);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 }); }
  let deadline: Date | null = null;
  if (body.deadline !== undefined && body.deadline !== null && body.deadline !== '') {
    deadline = new Date(String(body.deadline));
    if (Number.isNaN(deadline.getTime())) return NextResponse.json({ error: '截止日期格式無效' }, { status: 400 });
  }
  const publishedAt = status === 'published' ? new Date() : null;
  const optional = (key: string) => typeof body[key] === 'string' ? (body[key] as string).trim() || null : null;
  const data = { title, description: optional('description'), applicableStage: optional('applicableStage'), rules: optional('rules'), notice: optional('notice'), deadline, externalUrl, status, publishedAt };
  const result = await prisma.selectionInfo.upsert({ where: { siteId: context.site.id }, create: { siteId: context.site.id, ...data }, update: data });
  return NextResponse.json(result);
}
