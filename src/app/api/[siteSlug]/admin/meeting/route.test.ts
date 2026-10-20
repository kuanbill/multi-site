import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireContentPermission, mediaFindMany, transaction, meetingCreate, externalCreateMany } = vi.hoisted(() => ({
  requireContentPermission: vi.fn(),
  mediaFindMany: vi.fn(),
  transaction: vi.fn(),
  meetingCreate: vi.fn(),
  externalCreateMany: vi.fn(),
}));

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: { media: { findMany: mediaFindMany }, $transaction: transaction },
}));

import { POST } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };

function post(body: unknown) {
  return POST(new Request('http://localhost/api/site-a/admin/meeting', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), context);
}

describe('meeting collection external links', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 }, siteRole: 'editor' });
    mediaFindMany.mockReset().mockResolvedValue([]);
    meetingCreate.mockReset().mockResolvedValue({ id: 4, siteId: 7 });
    externalCreateMany.mockReset().mockResolvedValue({ count: 2 });
    transaction.mockReset().mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      meetingRecord: { create: meetingCreate },
      contentAttachment: { createMany: vi.fn() },
      contentExternalLink: { deleteMany: vi.fn(), createMany: externalCreateMany },
    }));
  });

  it('persists multiple Drive links independently from media attachments', async () => {
    const urls = ['https://drive.google.com/file/d/one/view', 'https://drive.google.com/file/d/two/view'];
    const response = await post({
      meetingType: 'board', title: '會議', meetingDate: '2026-10-20', driveUrls: urls,
    });

    expect(response.status).toBe(201);
    expect(externalCreateMany).toHaveBeenCalledWith({
      data: urls.map((url, sortOrder) => ({ siteId: 7, ownerType: 'meeting', ownerId: 4, url, sortOrder })),
    });
  });

  it('rejects an invalid Drive link', async () => {
    const response = await post({ meetingType: 'board', title: '會議', meetingDate: '2026-10-20', driveUrls: ['http://drive.google.com/file'] });

    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});
