import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const mediaFindMany = vi.hoisted(() => vi.fn());
const attachmentFindMany = vi.hoisted(() => vi.fn());
const attachmentCreateMany = vi.hoisted(() => vi.fn());
const externalCreateMany = vi.hoisted(() => vi.fn());
const externalFindMany = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());
const requireContentPermission = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    selectionInfo: { findMany, create },
    contentAttachment: { findMany: attachmentFindMany },
    contentExternalLink: { findMany: externalFindMany },
    media: { findMany: mediaFindMany },
    $transaction: transaction,
  },
}));
vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));

import { GET, POST } from './route';

const params = { params: Promise.resolve({ siteSlug: 'site' }) };

describe('selection collection API', () => {
  beforeEach(() => {
    findMany.mockReset();
    create.mockReset();
    mediaFindMany.mockReset();
    attachmentFindMany.mockReset();
    externalFindMany.mockReset().mockResolvedValue([]);
    attachmentCreateMany.mockReset();
    externalCreateMany.mockReset().mockResolvedValue({ count: 2 });
    transaction.mockReset();
    requireContentPermission.mockReset();
    requireContentPermission.mockResolvedValue({ site: { id: 8 } });
    findMany.mockResolvedValue([]);
    attachmentFindMany.mockResolvedValue([]);
    mediaFindMany.mockResolvedValue([{ id: 3 }, { id: 4 }]);
    create.mockResolvedValue({ id: 20, siteId: 8, title: '選配說明', status: 'draft' });
    transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({
      selectionInfo: { create },
      contentAttachment: { createMany: attachmentCreateMany },
      contentExternalLink: { deleteMany: vi.fn(), createMany: externalCreateMany },
    }));
  });

  it('lists only the current site’s selection items with ordered media attachments', async () => {
    findMany.mockResolvedValue([{ id: 10, title: '第一期', attachments: [] }]);
    attachmentFindMany.mockResolvedValue([{
      id: 7,
      ownerId: 10,
      mediaId: 3,
      label: '選配辦法.pdf',
      sortOrder: 0,
      media: { id: 3, type: 'pdf', filename: 'guide.pdf', url: '/uploads/guide.pdf' },
    }]);

    const response = await GET(new Request('http://localhost/api/site/admin/selection'), params);

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { siteId: 8 } }));
    expect(attachmentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { siteId: 8, ownerType: 'selection', ownerId: { in: [10] } },
      include: { media: true },
      orderBy: { sortOrder: 'asc' },
    }));
    await expect(response.json()).resolves.toMatchObject([{
      id: 10,
      title: '第一期',
      attachments: [{ id: 7, label: '選配辦法.pdf', media: { id: 3, type: 'pdf' } }],
    }]);
  });

  it('creates a draft selection and ordered file/image attachments', async () => {
    const response = await POST(new Request('http://localhost/api/site/admin/selection', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: '選配說明',
        attachments: [
          { mediaId: 3, label: '選配辦法.pdf' },
          { mediaId: 4, label: '配置圖.png' },
        ],
      }),
    }), params);

    expect(response.status).toBe(201);
    expect(mediaFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: [3, 4] }, siteId: 8 },
    }));
    expect(transaction).toHaveBeenCalledOnce();
    expect(attachmentCreateMany).toHaveBeenCalledWith({ data: [
      { siteId: 8, mediaId: 3, ownerType: 'selection', ownerId: 20, label: '選配辦法.pdf', sortOrder: 0 },
      { siteId: 8, mediaId: 4, ownerType: 'selection', ownerId: 20, label: '配置圖.png', sortOrder: 1 },
    ] });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ siteId: 8, title: '選配說明', status: 'draft' }) });
  });

  it('rejects attachments owned by another site before creating a selection', async () => {
    mediaFindMany.mockResolvedValue([{ id: 3 }]);
    const response = await POST(new Request('http://localhost/api/site/admin/selection', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '選配說明', attachments: [{ mediaId: 3 }, { mediaId: 4 }] }),
    }), params);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: '附件不存在或不屬於此站點' });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('persists multiple Google Drive links with existing media attachments', async () => {
    const urls = ['https://drive.google.com/file/d/one/view', 'https://drive.google.com/file/d/two/view'];
    const response = await POST(new Request('http://localhost/api/site/admin/selection', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '選配說明', driveUrls: urls }),
    }), params);

    expect(response.status).toBe(201);
    expect(externalCreateMany).toHaveBeenCalledWith({ data: urls.map((url, sortOrder) => ({ siteId: 8, ownerType: 'selection', ownerId: 20, url, sortOrder })) });
  });

  it('rejects invalid Google Drive links', async () => {
    const response = await POST(new Request('http://localhost/api/site/admin/selection', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '選配說明', driveUrls: ['http://drive.google.com/file'] }),
    }), params);

    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});
