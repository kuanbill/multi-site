import type { HomeSectionItem, HomeSectionSource } from './homeSections';

export const EXCERPT_MAX_LENGTH = 120;

type FeatureRef = { id: number; key: string; path: string; label: string } | null;

type FeatureEntryRow = {
  id: number;
  title: string;
  content: string | null;
  contentType: string;
  youtubeUrl: string | null;
  media: { url: string; altText: string | null } | null;
};

type AnnouncementRow = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  category: string | null;
  pinned: boolean;
  publishedAt: Date | null;
};

type ProgressRow = {
  id: number;
  stageLabel: string;
  title: string;
  summary: string | null;
  progressStatus: string;
  stageDate: Date;
};

type PageRow = { id: number; title: string; slug: string; content: string | null };

export type HomeSectionRows =
  | FeatureEntryRow[]
  | AnnouncementRow[]
  | ProgressRow[]
  | PageRow[];

export type { HomeSectionItem, FeatureRef };

function excerpt(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.length > EXCERPT_MAX_LENGTH ? `${trimmed.slice(0, EXCERPT_MAX_LENGTH)}...` : trimmed;
}

function formatDate(value: Date | null): string | null {
  return value ? new Date(value).toLocaleDateString('zh-TW') : null;
}

const PROGRESS_STATUS_LABELS: Record<string, string> = {
  completed: '已完成',
  current: '進行中',
  upcoming: '待辦',
};

/** 每種來源的「查看全部」目標；無法決定時回傳 null。 */
export function resolveSectionListPath(
  source: HomeSectionSource,
  siteSlug: string,
  feature: FeatureRef,
): string | null {
  switch (source) {
    case 'announcement':
      return `/${siteSlug}/announcement`;
    case 'progress':
      return `/${siteSlug}/progress`;
    case 'page':
      return `/${siteSlug}/pages`;
    case 'feature':
      return feature ? `/${siteSlug}/${feature.path}` : null;
  }
}

/** 自訂標題優先，其次用來源預設標題。 */
export function buildSectionTitle(custom: string | null | undefined, fallbackLabel: string): string {
  const trimmed = typeof custom === 'string' ? custom.trim() : '';
  return trimmed || fallbackLabel;
}

/** 把單一來源資料列映射為統一的呈現形狀。 */
export function resolveSectionItem(
  source: HomeSectionSource,
  row: FeatureEntryRow | AnnouncementRow | ProgressRow | PageRow,
  siteSlug: string,
  feature: FeatureRef,
): HomeSectionItem {
  switch (source) {
    case 'feature': {
      const entry = row as FeatureEntryRow;
      return {
        id: `feature-${entry.id}`,
        title: entry.title,
        excerpt: excerpt(entry.content),
        href: feature ? `/${siteSlug}/${feature.path}/${entry.id}` : null,
        imageUrl: entry.contentType === 'image' ? (entry.media?.url ?? null) : null,
        badge: entry.contentType === 'youtube' ? 'YouTube 影片' : null,
        meta: null,
      };
    }
    case 'announcement': {
      const announcement = row as AnnouncementRow;
      return {
        id: `announcement-${announcement.id}`,
        title: announcement.title,
        excerpt: excerpt(announcement.summary ?? announcement.content),
        href: `/${siteSlug}/announcement/${announcement.slug}`,
        imageUrl: null,
        badge: announcement.pinned ? '置頂' : announcement.category,
        meta: formatDate(announcement.publishedAt),
      };
    }
    case 'progress': {
      const progress = row as ProgressRow;
      return {
        id: `progress-${progress.id}`,
        title: `${progress.stageLabel} - ${progress.title}`,
        excerpt: excerpt(progress.summary),
        href: `/${siteSlug}/progress`,
        imageUrl: null,
        badge: PROGRESS_STATUS_LABELS[progress.progressStatus] ?? progress.progressStatus,
        meta: formatDate(progress.stageDate),
      };
    }
    case 'page': {
      const page = row as PageRow;
      return {
        id: `page-${page.id}`,
        title: page.title,
        excerpt: excerpt(page.content),
        href: `/${siteSlug}/pages/${page.slug}`,
        imageUrl: null,
        badge: null,
        meta: null,
      };
    }
  }
}

export function toSectionItems(
  source: HomeSectionSource,
  siteSlug: string,
  feature: FeatureRef,
  rows: HomeSectionRows,
): HomeSectionItem[] {
  return (rows as (FeatureEntryRow | AnnouncementRow | ProgressRow | PageRow)[]).map((row) =>
    resolveSectionItem(source, row, siteSlug, feature),
  );
}