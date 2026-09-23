import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission, requireSiteContext } from '@/lib/contentAccess';
import { parseContentStatus, validateProgressStatus, validateRequiredText } from '@/lib/contentValidation';

type RouteContext = { params: Promise<{ siteSlug: string }> };

function parseStageDate(value: unknown): Date {
  if (value === null || value === undefined || value === '') throw new Error('階段日期不得為空');
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error('階段日期格式無效');
  return date;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireSiteContext(siteSlug);
  const items = await prisma.progressItem.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ stageDate: 'asc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
  });
  return NextResponse.json(items);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;

  let title: string;
  let stageLabel: string;
  let stageDate: Date;
  let progressStatus: string;
  let status: string;
  try {
    title = validateRequiredText(record.title, 'title');
    const rawStageLabel = typeof record.stageLabel === 'string' ? record.stageLabel.trim() : '';
    if (!rawStageLabel) throw new Error('階段名稱不得為空');
    stageLabel = rawStageLabel;
    stageDate = parseStageDate(record.stageDate);
    progressStatus = validateProgressStatus(record.progressStatus);
    status = record.status === undefined || record.status === null || record.status === ''
      ? 'draft'
      : parseContentStatus(record.status);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  const summary = typeof record.summary === 'string' ? record.summary.trim() || null : null;
  const content = typeof record.content === 'string' ? record.content.trim() || null : null;
  const sortOrder = record.sortOrder === undefined || record.sortOrder === null || record.sortOrder === ''
    ? 0
    : Number(record.sortOrder);
  if (!Number.isInteger(sortOrder)) {
    return NextResponse.json({ error: '排序參數錯誤' }, { status: 400 });
  }

  const publishedAt = status === 'published' ? new Date() : null;
  const needDemote = status === 'published' && progressStatus === 'current';

  try {
    const created = await prisma.$transaction(async (tx) => {
      if (needDemote) {
        await tx.progressItem.updateMany({
          where: { siteId: context.site.id, status: 'published', progressStatus: 'current' },
          data: { progressStatus: 'completed' },
        });
      }
      return tx.progressItem.create({
        data: {
          siteId: context.site.id,
          stageDate,
          stageLabel,
          title,
          summary,
          content,
          progressStatus,
          status,
          sortOrder,
          publishedAt,
        },
      });
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: '建立失敗' }, { status: 500 });
  }
}
