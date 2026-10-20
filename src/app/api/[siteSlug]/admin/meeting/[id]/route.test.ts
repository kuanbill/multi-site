import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, findFirst, transaction, externalDeleteMany } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  findFirst: vi.fn(),
  transaction: vi.fn(),
  externalDeleteMany: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: { meetingRecord: { findFirst }, media: { findMany: vi.fn() }, contentAttachment: { findMany: vi.fn() }, $transaction: transaction },
}));

import { PATCH } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a', id: '4' }) };
const existing = { id: 4, siteId: 7, meetingType: 'board', title: '會議', meetingDate: new Date('2026-10-20'), status: 'published', publishedAt: new Date() };

describe('meeting item external links', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    findFirst.mockReset().mockResolvedValue(existing);
    externalDeleteMany.mockReset().mockResolvedValue({ count: 1 });
    transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      meetingRecord: { update: vi.fn().mockResolvedValue(existing) },
      contentAttachment: { deleteMany: vi.fn(), createMany: vi.fn(), count: vi.fn().mockResolvedValue(0) },
      contentExternalLink: { deleteMany: externalDeleteMany, createMany: vi.fn() },
    }));
  });

  it('clears Drive links when an empty list is submitted', async () => {
    const response = await PATCH(new Request('http://localhost/api/site-a/admin/meeting/4', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ driveUrls: [] }),
    }), context);

    expect(response.status).toBe(200);
    expect(externalDeleteMany).toHaveBeenCalledWith({ where: { siteId: 7, ownerType: 'meeting', ownerId: 4 } });
  });
});
