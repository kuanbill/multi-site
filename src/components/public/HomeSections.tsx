import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSiteFeatures } from '@/lib/site';
import { isSiteMember } from '@/lib/siteLogin';
import { resolveSectionVisibility, resolveSourceFeatureKey, type HomeSectionSource } from '@/lib/homeSections';
import { buildSectionTitle, resolveSectionListPath, toSectionItems, type FeatureRef } from '@/lib/homeSectionItems';
import { loadSectionRows } from '@/lib/homeSectionQueries';

type SectionRow = {
  id: number;
  sourceType: string;
  featureId: number | null;
  filter: string;
  title: string | null;
  limit: number;
  showAll: boolean;
  sortOrder: number;
};

type SiteFeatureRow = {
  enabled: boolean;
  visibility: string;
  feature: { key: string; label: string; path: string; id: number };
};

const DEFAULT_LABELS: Record<HomeSectionSource, string> = {
  feature: '功能資料',
  announcement: '最新公告',
  progress: '目前進度',
  page: '頁面',
};

function isSectionSource(value: string): value is HomeSectionSource {
  return value in DEFAULT_LABELS;
}

/** 一個區塊的呈現資料：可見性決定要不要查資料，標題與登入提示不依賴查詢結果。 */
type ResolvedSection = {
  id: number;
  title: string;
  items: ReturnType<typeof toSectionItems>;
  listHref: string | null;
  showAll: boolean;
  loginPrompt: boolean;
};

export async function buildHomeSections(
  siteId: number,
  siteSlug: string,
  sections: SectionRow[],
): Promise<ResolvedSection[]> {
  const [features, session] = await Promise.all([getSiteFeatures(siteId), getServerSession(authOptions)]);
  const isMember = isSiteMember(session, siteSlug);
  const featureById = new Map(features.map((row) => [row.feature.id, row]));
  const featureByKey = new Map(features.map((row) => [row.feature.key, row]));

  const visible: ResolvedSection[] = [];

  for (const section of sections) {
    if (!isSectionSource(section.sourceType)) continue;
    const source = section.sourceType;

    const owner: SiteFeatureRow | undefined =
      source === 'feature'
        ? (section.featureId === null ? undefined : featureById.get(section.featureId))
        : featureByKey.get(resolveSourceFeatureKey(source) ?? '');

    // 功能不存在或被停用一律隱藏。
    if (!owner?.enabled) continue;

    const visibility = resolveSectionVisibility(owner.visibility, isMember);
    if (visibility === 'hide') continue;

    const feature: FeatureRef = owner
      ? { id: owner.feature.id, key: owner.feature.key, path: owner.feature.path, label: owner.feature.label }
      : null;

    const label = source === 'feature' ? feature?.label : DEFAULT_LABELS[source];

    visible.push({
      id: section.id,
      title: buildSectionTitle(section.title, label ?? DEFAULT_LABELS[source]),
      items: [],
      listHref: resolveSectionListPath(source, siteSlug, feature),
      showAll: section.showAll,
      loginPrompt: visibility === 'login-prompt',
    });

    // 成員限定區塊對非成員只顯示登入提示，不查詢資料。
    if (visibility === 'login-prompt') continue;

    const rows = await loadSectionRows(siteId, source, section.featureId, {
      filter: section.filter,
      limit: section.limit,
    });
    visible[visible.length - 1].items = toSectionItems(source, siteSlug, feature, rows);
  }

  return visible;
}

export default async function HomeSections({
  siteId,
  siteSlug,
  sections,
}: {
  siteId: number;
  siteSlug: string;
  sections: SectionRow[];
}) {
  const resolved = await buildHomeSections(siteId, siteSlug, sections);
  if (resolved.length === 0) return null;

  return (
    <>
      {resolved.map((section, index) => (
        <div key={section.id} className={`bg-white p-6 rounded-lg shadow ${index < resolved.length - 1 ? 'mt-6' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">{section.title}</h2>
            {section.showAll !== false && section.listHref && (
              <Link href={section.listHref} className="text-sm text-primary hover:underline">
                查看全部 →
              </Link>
            )}
          </div>

          {section.loginPrompt ? (
            <p className="text-sm text-gray-600">
              此區塊僅限本站成員瀏覽，
              <Link
                href={`/${siteSlug}/login?reason=members-only`}
                className="text-primary hover:underline ml-1"
              >
                登入後查看
              </Link>
            </p>
          ) : section.items.length === 0 ? (
            <p className="text-gray-500">尚無資料</p>
          ) : (
            <ul className="space-y-4">
              {section.items.map((item) => (
                <li key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex gap-3">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="w-20 h-20 object-cover rounded shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.badge && (
                          <span className="text-xs bg-primary/10 text-accent px-1.5 py-0.5 rounded">{item.badge}</span>
                        )}
                        {item.href ? (
                          <Link href={item.href} className="font-medium text-primary hover:underline">
                            {item.title}
                          </Link>
                        ) : (
                          <span className="font-medium">{item.title}</span>
                        )}
                      </div>
                      {item.meta && <p className="text-xs text-gray-500 mt-0.5">{item.meta}</p>}
                      {item.excerpt && <p className="text-sm text-gray-600 mt-1">{item.excerpt}</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </>
  );
}