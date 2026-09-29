import { parseContentStatus, type ContentStatus } from './contentTypes';
import { validateRequiredText, validateSlug, validateExternalUrl, validateDateRange, validateAsset, type SiteHomeInput, type FeatureVisibility } from './contentValidation';
import { validateFeatureEntryInput, type FeatureEntryInput, type FeatureEntryType } from './featureEntryValidation';

/**
 * 安全地從 Request Body 讀取 JSON。
 * 失敗時回傳 null 並讓 caller 自行處理錯誤響應。
 */
export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * 把字符串形式的 id 轉為正整數，無效時回傳 null。
 */
export function parseId(value: string): number | null {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * 把多個可能的來源欄位名稱，統一讀出字符串並修剪空白。
 * 若全部缺失或空白，回傳 undefined（讓 caller 決定預設值）。
 */
export function readOptionalString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * 把多個可能的來源欄位名稱，統一讀出布林值。
 */
export function readOptionalBoolean(record: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const lower = v.trim().toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
    }
    if (typeof v === 'number') return v !== 0;
  }
  return undefined;
}

/**
 * 讀取排序值，預設 0。
 */
export function readSortOrder(record: Record<string, unknown>): number {
  const raw = record.sortOrder ?? record.order ?? record.position;
  if (raw === undefined || raw === null || raw === '') return 0;
  const n = Number(raw);
  return Number.isInteger(n) ? n : 0;
}

/**
 * 讀取內容狀態，若缺失則回傳 'draft'。
 */
export function readContentStatus(record: Record<string, unknown>): ContentStatus {
  const raw = record.status;
  if (raw === undefined || raw === null || raw === '') return 'draft';
  try {
    return parseContentStatus(raw);
  } catch {
    return 'draft';
  }
}

/**
 * 依據 status 與既有 publishedAt 計算應該寫入的 publishedAt 值。
 * 規則與原本各 API 保持一致：
 *  - 若 status 變為 'published'，且原本未發布，則設為 new Date()
 *  - 若 status 仍為 'published'，保留原本的 publishedAt
 *  - 若 status 變為非 published，則 null
 */
export function resolvePublishedAt(
  status: ContentStatus,
  existingPublishedAt: Date | null | undefined,
): Date | null | undefined {
  if (status === 'published') {
    return existingPublishedAt ?? new Date();
  }
  return null;
}

/**
 * 讀取日期字串或 Date 物件，轉為 Date。空值回傳 null。
 */
export function readDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 讀取媒體 ID 陣列（支援字串、陣列、或含 mediaId 欄位的物件陣列）。
 * 全部無效或空時回傳空陣列。
 */
export function readAttachmentIds(value: unknown): number[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    const ids: number[] = [];
    for (const item of value) {
      if (typeof item === 'object' && item !== null && 'mediaId' in item) {
        const n = Number((item as Record<string, unknown>).mediaId);
        if (Number.isInteger(n) && n > 0) ids.push(n);
      } else {
        const n = Number(item);
        if (Number.isInteger(n) && n > 0) ids.push(n);
      }
    }
    return ids;
  }
  // 字串形式（逗號分隔）
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n > 0);
  }
  return [];
}

/**
 * 共用 attachment 驗證：檢查所有 id 是否存在於該站點。
 * 回傳缺失的 id 陣列（空表示全部有效）。
 */
export async function validateAttachmentIds(
  siteId: number,
  ids: number[],
  prisma: import('@prisma/client').PrismaClient,
): Promise<number[]> {
  if (ids.length === 0) return [];
  const found = await prisma.media.findMany({
    where: { id: { in: ids }, siteId },
    select: { id: true },
  });
  const foundIds = new Set(found.map((m) => m.id));
  return ids.filter((id) => !foundIds.has(id));
}

/**
 * 共用 attachment 寫入：刪除舊的、建立新的 ContentAttachment 關聯。
 */
export async function syncAttachments(
  tx: import('@prisma/client').PrismaClient,
  siteId: number,
  ownerType: string,
  ownerId: number,
  mediaIds: number[],
  labels?: Record<number, string | null>,
): Promise<void> {
  await tx.contentAttachment.deleteMany({
    where: { siteId, ownerType, ownerId },
  });
  if (mediaIds.length === 0) return;
  await tx.contentAttachment.createMany({
    data: mediaIds.map((mediaId, index) => ({
      siteId,
      mediaId,
      ownerType,
      ownerId,
      sortOrder: index,
      label: labels?.[mediaId] ?? null,
    })),
  });
}
