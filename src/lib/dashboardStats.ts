import { prisma } from './prisma';

const RECENT_ACTIVITY_TAKE = 10;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type SiteDashboardStats = {
  userCount: number;
  totalViews: number;
  recent30DayViews: number;
  viewCountByFeature: Map<string, number>;
  labelByKey: Map<string, string>;
  siteFeatures: Array<{ feature: { key: string; label: string; icon: string | null } }>;
  recentLogins: Array<{ id: number; createdAt: Date; user: { name: string; email: string } }>;
  recentBrowses: Array<{ id: number; createdAt: Date; feature: string; path: string; user: { name: string } | null }>;
};

/** 子網站儀表板統計：功能瀏覽次數、最近登入與最近瀏覽。 */
export async function getSiteDashboardStats(siteId: number): Promise<SiteDashboardStats> {
  const since30Days = new Date(Date.now() - THIRTY_DAYS_MS);

  const [userCount, totalViews, recent30DayViews, viewTotals, recentLogins, recentBrowses, siteFeatures, featureLabels] =
    await Promise.all([
      prisma.siteUser.count({ where: { siteId } }),
      prisma.featureView.count({ where: { siteId } }),
      prisma.featureView.count({ where: { siteId, createdAt: { gte: since30Days } } }),
      prisma.featureView.groupBy({ by: ['feature'], where: { siteId }, _count: { _all: true } }),
      prisma.loginRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: RECENT_ACTIVITY_TAKE,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.featureView.findMany({
        where: { siteId, userId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: RECENT_ACTIVITY_TAKE,
        include: { user: { select: { name: true } } },
      }),
      prisma.siteFeature.findMany({
        where: { siteId, enabled: true },
        orderBy: { sortOrder: 'asc' },
        include: { feature: { select: { key: true, label: true, icon: true } } },
      }),
      prisma.featureDefinition.findMany({ select: { key: true, label: true } }),
    ]);

  return {
    userCount,
    totalViews,
    recent30DayViews,
    viewCountByFeature: new Map(viewTotals.map((row) => [row.feature, row._count._all])),
    labelByKey: new Map(featureLabels.map((row) => [row.key, row.label])),
    siteFeatures,
    recentLogins,
    recentBrowses,
  };
}
