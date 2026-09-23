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
  const existing = await prisma.selectionInfo.findUnique({ where: { siteId: context.site.id } });
  let title: string | undefined;
  let externalUrl: string | null | undefined;
  let status: string;
  try {
    if (body.title !== undefined) title = validateRequiredText(body.title, 'title');
    if (!existing && title === undefined) throw new Error('標題為必填');
    if (body.externalUrl !== undefined) externalUrl = validateExternalUrl(body.externalUrl);
    status = body.status === undefined
      ? existing?.status ?? 'draft'
      : parseContentStatus(body.status);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 }); }
  let deadline: Date | null | undefined;
  if (body.deadline !== undefined) {
    deadline = null;
    if (body.deadline !== null && body.deadline !== '') {
      deadline = new Date(String(body.deadline));
      if (Number.isNaN(deadline.getTime())) return NextResponse.json({ error: '截止日期格式無效' }, { status: 400 });
    }
  }
  const optional = (key: string) => body[key] === undefined
    ? undefined
    : typeof body[key] === 'string' ? (body[key] as string).trim() || null : null;
  const description = optional('description');
  const applicableStage = optional('applicableStage');
  const rules = optional('rules');
  const notice = optional('notice');
  const updateData: Record<string, unknown> = {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(applicableStage !== undefined ? { applicableStage } : {}),
    ...(rules !== undefined ? { rules } : {}),
    ...(notice !== undefined ? { notice } : {}),
    ...(deadline !== undefined ? { deadline } : {}),
    ...(externalUrl !== undefined ? { externalUrl } : {}),
  };
  const createData = {
    siteId: context.site.id,
    title: title!,
    description: description ?? null,
    applicableStage: applicableStage ?? null,
    rules: rules ?? null,
    notice: notice ?? null,
    deadline: deadline ?? null,
    externalUrl: externalUrl ?? null,
    status,
    publishedAt: status === 'published' ? new Date() : null,
  };
  if (body.status !== undefined) {
    updateData.status = status;
    updateData.publishedAt = status === 'published' ? existing?.publishedAt ?? new Date() : null;
  }
  const result = await prisma.selectionInfo.upsert({
    where: { siteId: context.site.id },
    create: createData,
    update: updateData,
  });
  return NextResponse.json(result);
}
