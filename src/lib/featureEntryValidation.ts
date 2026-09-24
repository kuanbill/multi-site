import { validateRequiredText } from './contentValidation';
import { CONTENT_FEATURES } from './features';

export const FEATURE_ENTRY_TYPES = ['text', 'youtube', 'image'] as const;
export type FeatureEntryType = (typeof FEATURE_ENTRY_TYPES)[number];

export interface FeatureEntryInput {
  title: string;
  contentType: FeatureEntryType;
  content: string | null;
  youtubeUrl: string | null;
  mediaId: number | null;
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const RESERVED_FEATURE_PATHS = new Set([
  ...CONTENT_FEATURES.map((feature) => feature.path),
  'admin',
  'home',
  'login',
  'maps',
  'pages',
  'posts',
  'settings',
  'users',
]);

export function parseFeatureEntryType(value: unknown): FeatureEntryType {
  if (typeof value === 'string' && FEATURE_ENTRY_TYPES.includes(value as FeatureEntryType)) {
    return value as FeatureEntryType;
  }
  throw new Error('內容類型無效');
}

export function parseYouTubeVideoId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('YouTube 網址無效');

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('YouTube 網址無效');
  }

  if (!['http:', 'https:'].includes(url.protocol) || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error('YouTube 網址無效');
  }

  let videoId: string | null = null;
  if (url.hostname.toLowerCase() === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (url.pathname === '/watch') {
    videoId = url.searchParams.get('v');
  } else {
    videoId = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)\/?$/)?.[1] ?? null;
  }

  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error('YouTube 網址無效');
  return videoId;
}

export function buildYouTubeEmbedUrl(videoId: string): string {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error('YouTube 影片編號無效');
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function isReservedFeaturePath(path: string): boolean {
  return RESERVED_FEATURE_PATHS.has(path.toLowerCase());
}

export function validateCustomFeaturePath(value: unknown): string {
  if (typeof value !== 'string') throw new Error('路徑僅允許小寫英文、數字、底線與連字號');
  const path = value.trim();
  if (!/^[a-z0-9_-]+$/.test(path)) throw new Error('路徑僅允許小寫英文、數字、底線與連字號');
  if (isReservedFeaturePath(path)) throw new Error('路徑與系統路由衝突');
  return path;
}

export function validateFeatureEntryInput(value: unknown): FeatureEntryInput {
  const record = isRecord(value) ? value : {};
  const title = validateRequiredText(record.title, 'title');
  const contentType = parseFeatureEntryType(record.contentType);
  const content = parseOptionalContent(record.content);

  if (contentType === 'text') {
    if (!content) throw new Error('內文不得為空');
    return { title, contentType, content, youtubeUrl: null, mediaId: null };
  }

  if (contentType === 'youtube') {
    if (typeof record.youtubeUrl !== 'string') throw new Error('YouTube 網址無效');
    parseYouTubeVideoId(record.youtubeUrl);
    return { title, contentType, content, youtubeUrl: record.youtubeUrl.trim(), mediaId: null };
  }

  return {
    title,
    contentType,
    content,
    youtubeUrl: null,
    mediaId: parsePositiveInteger(record.mediaId),
  };
}

function parseOptionalContent(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('內文格式無效');
  return value.trim() || null;
}

function parsePositiveInteger(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(number) || number < 1) throw new Error('媒體編號格式無效');
  return number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
