import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { readJsonBody, readDate, readSortOrder, readContentStatus } from '@/lib/adminValidation';
import { validateRequiredText, validateProgressStatus } from '@/lib/contentValidation';

type RouteContext = { params: Promise<{ siteSlug: string }> };

function parseStageDate(value: unknown): Date {
  const date = readDate(value);
  if (!date) throw new Error('階段日期不得為空');
  return date;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const items = await prisma.progressItem.findMany({
    where: { siteId: context.site.id },
    orderBy: [{ stageDate: 'asc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
  });
  return NextResponse.json(items);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');

  const record = await readJsonBody(request);
  if (!record) {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

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
    status = readContentStatus(record);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  const summary = typeof record.summary === 'string' ? record.summary.trim() || null : null;
  const content = typeof record.content === 'string' ? record.content.trim() || null : null;
  const sortOrder = readSortOrder(record);
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
