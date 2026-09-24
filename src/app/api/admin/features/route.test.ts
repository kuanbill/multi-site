import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirst, findUnique, create, getAdminSession } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  getAdminSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { featureDefinition: { findFirst, findUnique, create } },
}));
vi.mock('@/lib/auth', () => ({ getAdminSession }));

import { POST } from './route';

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/features', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin feature creation', () => {
  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue(null);
    findUnique.mockReset().mockResolvedValue(null);
    create.mockReset().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data }));
    getAdminSession.mockReset().mockResolvedValue({ user: { role: 'admin' } });
  });

  it('uses the path as the key when creating a feature', async () => {
    const response = await POST(createRequest({ label: '常見問題', path: 'faq-center', icon: '❓' }));

    expect(response.status).toBe(201);
    expect(findFirst).toHaveBeenCalledWith({
      where: { OR: [{ key: 'faq-center' }, { path: 'faq-center' }] },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ key: 'faq-center', path: 'faq-center', label: '常見問題' }),
    });
  });

  it('rejects a path already used by another feature', async () => {
    findFirst.mockResolvedValue({ id: 8 });

    const response = await POST(createRequest({ label: '常見問題', path: 'faq-center' }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: '此路徑已存在，請使用其他路徑' });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects paths outside the supported single-segment format', async () => {
    const response = await POST(createRequest({ label: '常見問題', path: 'info/faq' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: '路徑僅允許小寫英文、數字、底線與連字號' });
    expect(findFirst).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects paths reserved by static system routes', async () => {
    const response = await POST(createRequest({ label: '另一個公告', path: 'announcement' }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: '此路徑為系統保留，請更換其他路徑' });
    expect(findFirst).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
