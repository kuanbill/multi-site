import { canPerformContentAction, requireContentPermission } from '@/lib/contentAccess';
import { prisma } from '@/lib/prisma';
import HomeSectionsManager from '@/components/admin/HomeSectionsManager';
import HomeForm from './HomeForm';

export const dynamic = 'force-dynamic';

// pages／posts 使用舊的 Page／Post 資料模型，不作為「自訂功能資料」來源；
// 頁面另有專屬的來源類型。
const LEGACY_FEATURE_KEYS = new Set(['pages', 'posts']);

export default async function SiteHomePage({ params }: { params: Promise<{ siteSlug: string }> }) {
  const { siteSlug } = await params;
  const context = await requireContentPermission(siteSlug, 'read');
  const canWrite = canPerformContentAction(context.siteRole, 'write');

  const [home, sectionRows, siteFeatures] = await Promise.all([
    prisma.siteHome.findUnique({ where: { siteId: context.site.id } }),
    prisma.siteHomeSection.findMany({
      where: { siteId: context.site.id },
      include: { feature: { select: { id: true, label: true } } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
    prisma.siteFeature.findMany({
      where: { siteId: context.site.id, enabled: true },
      include: { feature: { select: { id: true, key: true, label: true } } },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  const features = siteFeatures
    .filter((row) => !LEGACY_FEATURE_KEYS.has(row.feature.key))
    .map((row) => ({ id: row.feature.id, key: row.feature.key, label: row.feature.label }));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{context.site.name} - 首頁設定</h2>
      <p className="text-gray-500 mb-6">{context.site.description || '管理站點首頁的介紹與聯絡資訊。'}</p>
      <HomeForm siteSlug={siteSlug} initial={home} />
      <div className="mt-6">
        <HomeSectionsManager
          siteSlug={siteSlug}
          initialSections={sectionRows.map((row) => ({
            id: row.id,
            sourceType: row.sourceType as HomeSectionRowSource,
            featureId: row.featureId,
            filter: row.filter,
            title: row.title,
            limit: row.limit,
            showAll: row.showAll,
            sortOrder: row.sortOrder,
            feature: row.feature,
          }))}
          features={features}
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}

type HomeSectionRowSource = 'feature' | 'announcement' | 'progress' | 'page';