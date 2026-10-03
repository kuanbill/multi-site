import { prisma } from '@/lib/prisma';
import { PUBLISHED_CONTENT_WHERE } from '@/lib/contentAccess';
import type { HomeSectionRows } from '@/lib/homeSectionItems';
import type { HomeSectionSource } from '@/lib/homeSections';

export type SectionLoadOptions = {
  filter: string | null;
  limit: number;
};

/**
 * 依區塊來源查出前台要呈現的資料列。
 * 缺少必要鍵（例如 feature 區塊未指定功能）時回傳空清單，讓畫面顯示標題與「尚無資料」。
 */
export async function loadSectionRows(
  siteId: number,
  source: HomeSectionSource,
  featureId: number | null,
  options: SectionLoadOptions,
): Promise<HomeSectionRows> {
  const { limit } = options;

  switch (source) {
    case 'feature': {
      if (!featureId) return [];
      return prisma.featureEntry.findMany({
        where: { siteId, featureId },
        include: { media: { select: { url: true, altText: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }
    case 'announcement': {
      return prisma.announcement.findMany({
        where: { siteId, ...PUBLISHED_CONTENT_WHERE },
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
        take: limit,
      });
    }
    case 'progress': {
      return prisma.progressItem.findMany({
        where: {
          siteId,
          ...PUBLISHED_CONTENT_WHERE,
          ...(options.filter === 'current' ? { progressStatus: 'current' } : {}),
        },
        orderBy: [{ stageDate: 'asc' }, { sortOrder: 'asc' }],
        take: limit,
      });
    }
    case 'page': {
      return prisma.page.findMany({
        where: { siteId },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });
    }
  }
}