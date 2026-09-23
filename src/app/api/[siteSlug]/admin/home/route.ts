import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireContentPermission } from '@/lib/contentAccess';
import { validateSiteHomeInput } from '@/lib/contentValidation';

type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const home = await prisma.siteHome.findUnique({
    where: { siteId: context.site.id },
    include: { heroMedia: { select: { url: true } } },
  });

  const { heroMedia, ...homeFields } = home ?? {
    id: 0,
    siteId: context.site.id,
    tagline: null,
    intro: null,
    heroMediaId: null,
    currentStage: null,
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    contactAddress: null,
    updatedAt: null,
  };

  return NextResponse.json({
    home: { ...homeFields, heroMediaUrl: heroMedia?.url ?? null },
    site: { name: context.site.name, description: context.site.description },
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  let input: ReturnType<typeof validateSiteHomeInput>;
  try {
    input = validateSiteHomeInput(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '參數錯誤' }, { status: 400 });
  }

  try {
    const heroMediaId = await resolveHeroMediaId(context.site.id, input.heroMediaId, input.heroMediaUrl);
    const saved = await prisma.siteHome.upsert({
      where: { siteId: context.site.id },
      create: {
        siteId: context.site.id,
        tagline: input.tagline,
        intro: input.intro,
        heroMediaId,
        currentStage: input.currentStage,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        contactAddress: input.contactAddress,
      },
      update: {
        tagline: input.tagline,
        intro: input.intro,
        heroMediaId,
        currentStage: input.currentStage,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        contactAddress: input.contactAddress,
      },
    });
    return NextResponse.json(saved);
  } catch (error) {
    if (error instanceof Error && error.message === '首頁主圖不存在或不屬於此站點') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: '首頁設定儲存失敗' }, { status: 500 });
  }
}

async function resolveHeroMediaId(siteId: number, heroMediaId: number | null, heroMediaUrl: string | null) {
  if (heroMediaId === null && !heroMediaUrl) return null;

  const media = heroMediaId
    ? await prisma.media.findFirst({ where: { id: heroMediaId, siteId }, select: { id: true, url: true } })
    : await prisma.media.findFirst({ where: { siteId, url: heroMediaUrl ?? '' }, select: { id: true, url: true } });
  if (!media || (heroMediaUrl && media.url !== heroMediaUrl)) {
    throw new Error('首頁主圖不存在或不屬於此站點');
  }
  return media.id;
}
