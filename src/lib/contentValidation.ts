import {
  CONTENT_STATUSES,
  MEETING_TYPES,
  type ContentStatus,
  type MeetingType,
} from './contentTypes';

export const PROGRESS_STATUSES = ['completed', 'current', 'upcoming'] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];
export const FEATURE_VISIBILITIES = ['public', 'members'] as const;
export type FeatureVisibility = (typeof FEATURE_VISIBILITIES)[number];

export type SiteHomeInput = {
  tagline: string | null;
  intro: string | null;
  currentStage: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  heroMediaId: number | null;
  heroMediaUrl: string | null;
};

const ASSET_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

const FIELD_LABELS: Record<string, string> = {
  name: '名稱',
  title: '標題',
};

export function parseContentStatus(value: unknown): ContentStatus {
  if (typeof value === 'string' && CONTENT_STATUSES.includes(value as ContentStatus)) {
    return value as ContentStatus;
  }
  throw new Error('內容狀態無效');
}

export function parseFeatureVisibility(value: unknown): FeatureVisibility {
  if (typeof value === 'string' && FEATURE_VISIBILITIES.includes(value as FeatureVisibility)) {
    return value as FeatureVisibility;
  }
  throw new Error('功能可見性無效');
}

export function validateSiteHomeInput(value: unknown): SiteHomeInput {
  const body = isRecord(value) ? value : {};
  const tagline = optionalText(body.tagline);
  if (body.tagline !== undefined && !tagline) throw new Error('標語不得為空');

  const contactEmail = optionalText(body.contactEmail);
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error('聯絡電子郵件格式無效');
  }

  const heroMediaId = body.heroMediaId === undefined || body.heroMediaId === null || body.heroMediaId === ''
    ? null
    : parsePositiveInteger(body.heroMediaId, '首頁主圖');
  const heroMediaUrl = optionalText(body.heroMediaUrl);

  return {
    tagline,
    intro: optionalText(body.intro),
    currentStage: optionalText(body.currentStage),
    contactName: optionalText(body.contactName),
    contactPhone: optionalText(body.contactPhone),
    contactEmail,
    contactAddress: optionalText(body.contactAddress),
    heroMediaId,
    heroMediaUrl,
  };
}

export function validateSlug(value: unknown): string {
  if (typeof value !== 'string') throw new Error('識別碼不得為空');
  const slug = value.trim();
  if (!slug) throw new Error('識別碼不得為空');
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('識別碼僅允許小寫英文、數字與連字號');
  }
  return slug;
}

export function validateExternalUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error('網址必須使用 http 或 https');

  const url = value.trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
  } catch {
    throw new Error('網址必須使用 http 或 https');
  }
  return url;
}

export function validateRequiredText(value: unknown, field: 'title' | 'name'): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(`${FIELD_LABELS[field]}不得為空`);
  return text;
}

export function validateMeetingType(value: unknown): MeetingType {
  if (typeof value === 'string' && MEETING_TYPES.includes(value as MeetingType)) {
    return value as MeetingType;
  }
  throw new Error('會議類型無效');
}

export function validateProgressStatus(value: unknown): ProgressStatus {
  if (typeof value === 'string' && PROGRESS_STATUSES.includes(value as ProgressStatus)) {
    return value as ProgressStatus;
  }
  throw new Error('進度狀態無效');
}

export function validateDateRange(
  startValue: unknown,
  endValue: unknown,
): { startDate: Date | null; endDate: Date | null } {
  const startDate = parseOptionalDate(startValue, '開始日期');
  const endDate = parseOptionalDate(endValue, '結束日期');
  if (startDate && endDate && endDate < startDate) {
    throw new Error('結束日期不可早於開始日期');
  }
  return { startDate, endDate };
}

export function validateAsset(file: File): { extension: string; mimeType: string } {
  if (file.size > 10 * 1024 * 1024) throw new Error('檔案大小不可超過 10 MB');
  const mimeType = typeof file?.type === 'string' ? file.type.toLowerCase() : '';
  const extension = ASSET_EXTENSIONS[mimeType];
  if (!extension) {
    throw new Error('檔案僅允許圖片或 PDF');
  }

  return { extension, mimeType };
}

function parseOptionalDate(value: unknown, label: string): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error(`${label}格式無效`);
  return date;
}

function optionalText(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('文字欄位格式無效');
  const text = value.trim();
  return text || null;
}

function parsePositiveInteger(value: unknown, label: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${label}編號格式無效`);
  return number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
