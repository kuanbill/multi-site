import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirst = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
const deleteSelection = vi.hoisted(() => vi.fn());
const attachmentDeleteMany = vi.hoisted(() => vi.fn());
const mediaFindMany = vi.hoisted(() => vi.fn());
const attachmentCreateMany = vi.hoisted(() => vi.fn());
const externalDeleteMany = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());
const requireContentPermission = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    selectionInfo: { findFirst, update, delete: deleteSelection },
    contentAttachment: { findMany: vi.fn() },
    contentExternalLink: { findMany: vi.fn() },
    media: { findMany: mediaFindMany },
    $transaction: transaction,
  },
}));
vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));

import { DELETE, PATCH } from './route';

const existing = {
  id: 20,
  siteId: 8,
  title: '舊標題',
  description: '原說明',
  applicableStage: null,
  rules: null,
  notice: null,
  deadline: null,
  externalUrl: null,
  status: 'published',
  publishedAt: new Date('2026-09-01T00:00:00.000Z'),
  createdAt: new Date('2026-09-01T00:00:00.000Z'),
  updatedAt: new Date('2026-09-01T00:00:00.000Z'),
};
const params = { params: Promise.resolve({ siteSlug: 'site', id: '20' }) };

describe('selection item API', () => {
  beforeEach(() => {
    findFirst.mockReset();
    update.mockReset();
    deleteSelection.mockReset();
    attachmentDeleteMany.mockReset();
    mediaFindMany.mockReset();
    attachmentCreateMany.mockReset();
    externalDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    transaction.mockReset();
    requireContentPermission.mockReset();
    requireContentPermission.mockResolvedValue({ site: { id: 8 } });
    findFirst.mockResolvedValue(existing);
    update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...existing, ...data }));
    mediaFindMany.mockResolvedValue([{ id: 3 }]);
    transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({
      selectionInfo: { update, delete: deleteSelection },
      contentAttachment: { deleteMany: attachmentDeleteMany, createMany: attachmentCreateMany },
      contentExternalLink: { deleteMany: externalDeleteMany, createMany: vi.fn() },
    }));
  });

  it('updates only the selected item and preserves omitted fields/publication state', async () => {
    const response = await PATCH(new Request('http://localhost/api/site/admin/selection/20', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '新標題' }),
    }), params);

    expect(response.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 20, siteId: 8 } });
    expect(update).toHaveBeenCalledWith({ where: { id: 20 }, data: { title: '新標題' } });
    await expect(response.json()).resolves.toMatchObject({
      title: '新標題', description: '原說明', status: 'published',
      publishedAt: existing.publishedAt.toISOString(),
    });
  });

  it('replaces attachments transactionally when editing them', async () => {
    const response = await PATCH(new Request('http://localhost/api/site/admin/selection/20', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attachments: [{ mediaId: 3, label: '辦法.pdf' }] }),
    }), params);

    expect(response.status).toBe(200);
    expect(attachmentDeleteMany).toHaveBeenCalledWith({ where: { siteId: 8, ownerType: 'selection', ownerId: 20 } });
    expect(attachmentCreateMany).toHaveBeenCalledWith({ data: [{
      siteId: 8, mediaId: 3, ownerType: 'selection', ownerId: 20, label: '辦法.pdf', sortOrder: 0,
    }] });
  });

  it('rejects an attachment from another site without changing the item', async () => {
    mediaFindMany.mockResolvedValue([]);
    const response = await PATCH(new Request('http://localhost/api/site/admin/selection/20', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attachments: [{ mediaId: 99 }] }),
    }), params);

    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('clears the publication timestamp only when explicitly changed to draft', async () => {
    const response = await PATCH(new Request('http://localhost/api/site/admin/selection/20', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    }), params);

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: 20 }, data: { status: 'draft', publishedAt: null } });
  });

  it('deletes only the selection item and its attachment links', async () => {
    const response = await DELETE(new Request('http://localhost/api/site/admin/selection/20', { method: 'DELETE' }), params);

    expect(response.status).toBe(200);
    expect(requireContentPermission).toHaveBeenCalledWith('site', 'delete');
    expect(attachmentDeleteMany).toHaveBeenCalledWith({ where: { siteId: 8, ownerType: 'selection', ownerId: 20 } });
    expect(deleteSelection).toHaveBeenCalledWith({ where: { id: 20 } });
  });

  it('returns not found for an item belonging to another site', async () => {
    findFirst.mockResolvedValue(null);
    const response = await PATCH(new Request('http://localhost/api/site/admin/selection/20', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: '修改' }),
    }), params);

    expect(response.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it('clears Google Drive links when an empty list is submitted', async () => {
    const response = await PATCH(new Request('http://localhost/api/site/admin/selection/20', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ driveUrls: [] }),
    }), params);

    expect(response.status).toBe(200);
    expect(externalDeleteMany).toHaveBeenCalledWith({ where: { siteId: 8, ownerType: 'selection', ownerId: 20 } });
  });

  it('cleans Google Drive links when deleting the selection item', async () => {
    const response = await DELETE(new Request('http://localhost/api/site/admin/selection/20', { method: 'DELETE' }), params);

    expect(response.status).toBe(200);
    expect(externalDeleteMany).toHaveBeenCalledWith({ where: { siteId: 8, ownerType: 'selection', ownerId: 20 } });
  });
});
