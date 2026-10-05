import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  siteUserCount,
  featureViewCount,
  featureViewGroupBy,
  loginRecordFindMany,
  featureViewFindMany,
  siteFeatureFindMany,
  featureDefinitionFindMany,
} = vi.hoisted(() => ({
  siteUserCount: vi.fn(),
  featureViewCount: vi.fn(),
  featureViewGroupBy: vi.fn(),
  loginRecordFindMany: vi.fn(),
  featureViewFindMany: vi.fn(),
  siteFeatureFindMany: vi.fn(),
  featureDefinitionFindMany: vi.fn(),
}));

vi.mock('./prisma', () => ({
  prisma: {
    siteUser: { count: siteUserCount },
    featureView: { count: featureViewCount, groupBy: featureViewGroupBy, findMany: featureViewFindMany },
    loginRecord: { findMany: loginRecordFindMany },
    siteFeature: { findMany: siteFeatureFindMany },
    featureDefinition: { findMany: featureDefinitionFindMany },
  },
}));

import { getSiteDashboardStats } from './dashboardStats';

describe('getSiteDashboardStats', () => {
  beforeEach(() => {
    siteUserCount.mockReset().mockResolvedValue(3);
    featureViewCount.mockReset().mockResolvedValueOnce(10).mockResolvedValueOnce(4);
    featureViewGroupBy.mockReset().mockResolvedValue([{ feature: 'announcements', _count: { _all: 10 } }]);
    loginRecordFindMany.mockReset().mockResolvedValue([
      { id: 1, createdAt: new Date('2026-10-05T01:00:00Z'), user: { name: '管理員', email: 'admin@example.com' } },
    ]);
    featureViewFindMany.mockReset().mockResolvedValue([
      { id: 5, createdAt: new Date('2026-10-05T02:00:00Z'), feature: 'meetings', path: '/site-a/meeting', user: { name: '編輯者' } },
    ]);
    siteFeatureFindMany.mockReset().mockResolvedValue([
      { feature: { key: 'announcements', label: '公告欄', icon: '📢' } },
    ]);
    featureDefinitionFindMany.mockReset().mockResolvedValue([
      { key: 'announcements', label: '公告欄' },
      { key: 'meetings', label: '會議記錄' },
    ]);
  });

  it('aggregates counts, per-feature views and labels', async () => {
    const stats = await getSiteDashboardStats(7);

    expect(stats.userCount).toBe(3);
    expect(stats.totalViews).toBe(10);
    expect(stats.recent30DayViews).toBe(4);
    expect(stats.viewCountByFeature.get('announcements')).toBe(10);
    expect(stats.labelByKey.get('meetings')).toBe('會議記錄');
    expect(stats.siteFeatures).toHaveLength(1);
    expect(stats.recentLogins[0].user.name).toBe('管理員');
    expect(stats.recentBrowses[0]).toMatchObject({ feature: 'meetings', path: '/site-a/meeting' });
    expect(featureViewCount).toHaveBeenCalledWith(expect.objectContaining({ where: { siteId: 7 } }));
  });
});
