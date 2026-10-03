export const HOME_SECTION_SOURCES = ['feature', 'announcement', 'progress', 'page'] as const;
export type HomeSectionSource = (typeof HOME_SECTION_SOURCES)[number];

export const PROGRESS_SECTION_FILTERS = ['current', 'all'] as const;
export type ProgressSectionFilter = (typeof PROGRESS_SECTION_FILTERS)[number];

export const HOME_SECTION_LIMITS = { min: 1, max: 12 } as const;

export const HOME_SECTION_MAX_COUNT = 6;

export const DEFAULT_HOME_SECTIONS: readonly {
  sourceType: HomeSectionSource;
  filter: ProgressSectionFilter;
  title: string;
  limit: number;
  showAll: boolean;
}[] = [
  { sourceType: 'announcement', filter: 'all', title: '最新公告', limit: 3, showAll: true },
  { sourceType: 'progress', filter: 'current', title: '目前進度', limit: 1, showAll: true },
  { sourceType: 'page', filter: 'all', title: '頁面', limit: 12, showAll: false },
];

export type SectionVisibilityInput = string | null | undefined;
export type SectionVisibility = 'show' | 'login-prompt' | 'hide';

/**
 * 區塊可見性。功能被停用一律隱藏；成員限定區塊對非成員只提示登入，
 * 不查詢資料也不顯示標題以外的內容。
 */
export function resolveSectionVisibility(visibility: SectionVisibilityInput, isMember: boolean): SectionVisibility {
  if (visibility === 'public') return 'show';
  if (visibility === 'members') return isMember ? 'show' : 'login-prompt';
  return 'hide';
}

/**
 * 非 feature 型區塊的資料來源各自對應一個站台功能，可見性由該功能決定。
 * feature 型區塊直接帶自己的 featureId，不在此對應。
 */
export function resolveSourceFeatureKey(source: HomeSectionSource): string | null {
  switch (source) {
    case 'announcement':
      return 'announcements';
    case 'progress':
      return 'progress';
    case 'page':
      return 'pages';
    default:
      return null;
  }
}

export type HomeSectionInput = {
  sourceType: HomeSectionSource;
  featureId: number | null;
  filter: ProgressSectionFilter;
  title: string | null;
  limit: number;
  showAll: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function validateHomeSectionInput(value: unknown): HomeSectionInput {
  const body = isRecord(value) ? value : {};
  const sourceType = body.sourceType;
  if (typeof sourceType !== 'string' || !(HOME_SECTION_SOURCES as readonly string[]).includes(sourceType)) {
    throw new Error('資料來源無效');
  }
  const source = sourceType as HomeSectionSource;

  let featureId: number | null = null;
  if (source === 'feature') {
    const raw = typeof body.featureId === 'number' ? body.featureId : Number(body.featureId);
    if (!Number.isInteger(raw) || raw <= 0) throw new Error('功能項無效');
    featureId = raw;
  } else if (body.featureId !== undefined && body.featureId !== null && body.featureId !== '') {
    throw new Error('此資料來源不需指定功能項');
  }

  let filter: ProgressSectionFilter = 'all';
  if (source === 'progress') {
    const raw = body.filter ?? 'all';
    if (typeof raw !== 'string' || !(PROGRESS_SECTION_FILTERS as readonly string[]).includes(raw)) {
      throw new Error('篩選無效');
    }
    filter = raw as ProgressSectionFilter;
  } else if (body.filter !== undefined && body.filter !== null && body.filter !== '' && body.filter !== 'all') {
    throw new Error('篩選僅適用於都更進度');
  }

  const limit =
    body.limit === undefined || body.limit === null || body.limit === ''
      ? 3
      : typeof body.limit === 'number'
        ? body.limit
        : Number(body.limit);
  if (
    !Number.isInteger(limit) ||
    limit < HOME_SECTION_LIMITS.min ||
    limit > HOME_SECTION_LIMITS.max
  ) {
    throw new Error(`顯示筆數須介於 ${HOME_SECTION_LIMITS.min} 與 ${HOME_SECTION_LIMITS.max} 之間`);
  }

  return {
    sourceType: source,
    featureId,
    filter,
    title: optionalText(body.title),
    limit,
    showAll: body.showAll === undefined ? true : Boolean(body.showAll),
  };
}

/** 前台統一呈現形狀，四種來源都映射到此結構。 */
export type HomeSectionItem = {
  id: string;
  title: string;
  excerpt: string | null;
  href: string | null;
  imageUrl: string | null;
  badge: string | null;
  meta: string | null;
};