import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canManageSiteSettings, requireContentPermission, requireSiteContext } from '@/lib/contentAccess';
import { parseFeatureVisibility } from '@/lib/contentValidation';
import { mergeSiteFeatures } from '@/lib/features';

type RouteContext = { params: Promise<{ siteSlug: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const { site } = await requireSiteContext(siteSlug);
  const definitions = await prisma.featureDefinition.findMany({ orderBy: { createdAt: 'asc' } });
  const siteFeatures = await prisma.siteFeature.findMany({ where: { siteId: site.id } });
  return NextResponse.json(
    mergeSiteFeatures(
      definitions,
      siteFeatures.map((feature) => ({
        featureId: feature.featureId,
        enabled: feature.enabled,
        sortOrder: feature.sortOrder,
        displayMode: feature.displayMode,
        visibility: parseFeatureVisibility(feature.visibility),
      })),
    ),
  );
}

async function saveFeatures(request: Request, { params }: RouteContext) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'write');
  const canChangeVisibility = canManageSiteSettings(context.siteRole);
  if (!canChangeVisibility) {
    return NextResponse.json({ error: '只有站點管理員可修改功能設定' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '參數格式錯誤' }, { status: 400 });
  }

  try {
    const features = readFeaturePayload(body);
    const definitions = await prisma.featureDefinition.findMany({ orderBy: { createdAt: 'asc' } });
    const definitionIds = new Set(definitions.map((definition) => definition.id));
    const existing = await prisma.siteFeature.findMany({ where: { siteId: context.site.id } });
    const existingMap = new Map(existing.map((feature) => [feature.featureId, feature]));
    const normalized = features.map((feature) => {
      if (!definitionIds.has(feature.featureId)) throw new Error('功能參數錯誤');
      if (typeof feature.enabled !== 'boolean') throw new Error('功能參數錯誤');
      const sortOrder = feature.sortOrder ?? 0;
      if (!Number.isInteger(sortOrder)) throw new Error('排序參數錯誤');
      const displayMode = feature.displayMode ?? 'list';
      if (!['list', 'card', 'grid'].includes(displayMode)) throw new Error('顯示方式無效');
      const current = existingMap.get(feature.featureId);
      const visibility = feature.visibility === undefined
        ? parseFeatureVisibility(current?.visibility ?? 'public')
        : parseFeatureVisibility(feature.visibility);
      if (!canChangeVisibility && current && visibility !== current.visibility) {
        throw new Error('只有站點管理員可設定功能可見性');
      }
      if (!canChangeVisibility && !current && visibility !== 'public') {
        throw new Error('只有站點管理員可設定功能可見性');
      }
      return { ...feature, sortOrder, displayMode, visibility };
    });

    for (const feature of normalized) {
      await prisma.siteFeature.upsert({
        where: { siteId_featureId: { siteId: context.site.id, featureId: feature.featureId } },
        update: {
          enabled: feature.enabled,
          sortOrder: feature.sortOrder,
          displayMode: feature.displayMode,
          visibility: feature.visibility,
        },
        create: {
          siteId: context.site.id,
          featureId: feature.featureId,
          enabled: feature.enabled,
          sortOrder: feature.sortOrder,
          displayMode: feature.displayMode,
          visibility: feature.visibility,
        },
      });
    }
    return NextResponse.json({ message: '已更新' });
  } catch (error) {
    if (error instanceof Error && [
      '參數錯誤',
      '功能參數錯誤',
      '排序參數錯誤',
      '顯示方式無效',
      '功能可見性無效',
      '只有站點管理員可設定功能可見性',
    ].includes(error.message)) {
      return NextResponse.json({ error: error.message }, { status: error.message.includes('只有') ? 403 : 400 });
    }
    return NextResponse.json({ error: '更新失敗' }, { status: 500 });
  }
}

function readFeaturePayload(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray((value as { features?: unknown }).features)) {
    throw new Error('參數錯誤');
  }
  return (value as { features: FeaturePayload[] }).features;
}

type FeaturePayload = {
  featureId: number;
  enabled: boolean;
  sortOrder?: number;
  displayMode?: string;
  visibility?: unknown;
};

export async function PUT(request: Request, context: RouteContext) {
  return saveFeatures(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return saveFeatures(request, context);
}
