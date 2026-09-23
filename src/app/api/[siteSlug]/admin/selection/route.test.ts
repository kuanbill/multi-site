import { beforeEach, describe, expect, it, vi } from 'vitest';

const findUnique = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());
const requireContentPermission = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({ prisma: { selectionInfo: { findUnique, upsert } } }));
vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));

import { PATCH } from './route';

const existing = {
  id: 4,
  siteId: 8,
  title: '既有選配說明',
  description: '原說明',
  applicableStage: '權利變換',
  rules: '原規則',
  notice: '原注意事項',
  deadline: new Date('2026-12-01T00:00:00.000Z'),
  externalUrl: 'https://example.com/selection',
  status: 'published',
  publishedAt: new Date('2026-09-01T00:00:00.000Z'),
  updatedAt: new Date('2026-09-01T00:00:00.000Z'),
};

describe('selection PATCH', () => {
  beforeEach(() => {
    findUnique.mockReset();
    upsert.mockReset();
    requireContentPermission.mockReset();
    requireContentPermission.mockResolvedValue({ site: { id: 8 } });
    findUnique.mockResolvedValue(existing);
    upsert.mockImplementation(async ({ update }: { update: Record<string, unknown> }) => ({ ...existing, ...update }));
  });

  it('preserves omitted fields and publication state during a partial edit', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/site/admin/selection', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: '更新後的說明' }),
      }),
      { params: Promise.resolve({ siteSlug: 'site' }) },
    );

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith({
      where: { siteId: 8 },
      create: expect.objectContaining({ siteId: 8, title: '更新後的說明', status: 'published' }),
      update: { title: '更新後的說明' },
    });
    await expect(response.json()).resolves.toMatchObject({
      title: '更新後的說明',
      description: '原說明',
      status: 'published',
      publishedAt: existing.publishedAt.toISOString(),
    });
  });

  it('clears publishedAt only when the caller explicitly unpublishes', async () => {
    await PATCH(
      new Request('http://localhost/api/site/admin/selection', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      }),
      { params: Promise.resolve({ siteSlug: 'site' }) },
    );

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { status: 'draft', publishedAt: null },
    }));
  });
});
