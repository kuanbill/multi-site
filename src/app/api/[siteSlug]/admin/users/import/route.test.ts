import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';

const { requireSiteContext, hash, userFindUnique, userCreate, siteUserFindUnique, siteUserCount, siteUserCreate } =
  vi.hoisted(() => ({
    requireSiteContext: vi.fn(),
    hash: vi.fn(),
    userFindUnique: vi.fn(),
    userCreate: vi.fn(),
    siteUserFindUnique: vi.fn(),
    siteUserCount: vi.fn(),
    siteUserCreate: vi.fn(),
  }));

vi.mock('@/lib/contentAccess', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/contentAccess')>()),
  requireSiteContext,
}));
vi.mock('bcryptjs', () => ({ hash }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique, create: userCreate },
    siteUser: { findUnique: siteUserFindUnique, count: siteUserCount, create: siteUserCreate },
  },
}));

import { POST } from './route';

const context = { params: Promise.resolve({ siteSlug: 'site-a' }) };

function siteContextOf(siteRole: string) {
  return {
    site: { id: 7, slug: 'site-a' },
    session: { user: { id: '1', role: 'editor', siteRoles: [{ slug: 'site-a', role: siteRole }] } },
    siteRole,
  };
}

async function memberFile(values: unknown[][]): Promise<File> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('成員匯入');
  values.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer as unknown as ArrayBuffer);
  return new File([bytes], 'members.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function importRequest(file?: File) {
  const form = new FormData();
  if (file) form.append('file', file);
  return new Request('http://localhost/api/site-a/admin/users/import', { method: 'POST', body: form });
}

const validRows = [
  ['Email', '姓名', '手機'],
  ['a@example.com', '王小明', '0912345678'],
];

describe('site member import API', () => {
  beforeEach(() => {
    requireSiteContext.mockReset().mockResolvedValue(siteContextOf('admin'));
    hash.mockReset().mockResolvedValue('hashed');
    userFindUnique.mockReset().mockResolvedValue(null);
    userCreate.mockReset().mockResolvedValue({ id: 11, email: 'a@example.com', name: '王小明' });
    siteUserFindUnique.mockReset().mockResolvedValue(null);
    siteUserCount.mockReset().mockResolvedValue(0);
    siteUserCreate.mockReset().mockResolvedValue({ id: 501, role: 'viewer' });
  });

  it('rejects a viewer', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('viewer'));

    const response = await POST(importRequest(await memberFile(validRows)), context);

    expect(response.status).toBe(403);
    expect(userCreate).not.toHaveBeenCalled();
    expect(siteUserCreate).not.toHaveBeenCalled();
  });

  it('creates a viewer member in the current site only', async () => {
    const response = await POST(importRequest(await memberFile(validRows)), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(userCreate).toHaveBeenCalledWith({
      data: {
        email: 'a@example.com',
        name: '王小明',
        phone: '0912345678',
        password: 'hashed',
        role: 'viewer',
      },
    });
    expect(siteUserCreate).toHaveBeenCalledTimes(1);
    expect(siteUserCreate).toHaveBeenCalledWith({ data: { userId: 11, siteId: 7, role: 'viewer' } });
    expect(body.created).toHaveLength(1);
    expect(body.created[0].password).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(body.created[0].generated).toBe(true);
    expect(body.errors).toEqual([]);
  });

  it('allows an editor to import', async () => {
    requireSiteContext.mockResolvedValue(siteContextOf('editor'));

    const response = await POST(importRequest(await memberFile(validRows)), context);

    expect(response.status).toBe(200);
    expect(siteUserCreate).toHaveBeenCalledWith({ data: { userId: 11, siteId: 7, role: 'viewer' } });
  });

  it('skips an account that is already a member of this site', async () => {
    userFindUnique.mockResolvedValue({ id: 12, email: 'a@example.com', name: '舊帳號', role: 'editor', allSites: false });
    siteUserFindUnique.mockResolvedValue({ id: 9, userId: 12, siteId: 7, role: 'editor' });

    const response = await POST(importRequest(await memberFile(validRows)), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.skipped).toEqual([{ email: 'a@example.com', reason: '已是本站成員' }]);
    expect(siteUserCreate).not.toHaveBeenCalled();
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('fails an account that already belongs to another site', async () => {
    userFindUnique.mockResolvedValue({ id: 12, email: 'a@example.com', name: '他站帳號', role: 'editor', allSites: false });
    siteUserFindUnique.mockResolvedValue(null);
    siteUserCount.mockResolvedValue(1);

    const response = await POST(importRequest(await memberFile(validRows)), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].reason).toContain('其他專案');
    expect(siteUserCreate).not.toHaveBeenCalled();
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('links an existing global admin without creating a new user', async () => {
    userFindUnique.mockResolvedValue({ id: 13, email: 'a@example.com', name: '超級管理員', role: 'admin', allSites: false });
    siteUserFindUnique.mockResolvedValue(null);
    siteUserCount.mockResolvedValue(1);

    const response = await POST(importRequest(await memberFile(validRows)), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.created[0]).toMatchObject({ generated: false, password: '' });
    expect(siteUserCreate).toHaveBeenCalledWith({ data: { userId: 13, siteId: 7, role: 'viewer' } });
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('reports invalid rows without blocking valid ones', async () => {
    userCreate.mockResolvedValueOnce({ id: 21, email: 'b@example.com', name: '乙' });

    const response = await POST(
      importRequest(
        await memberFile([
          ['Email', '姓名', '手機'],
          ['bad-email', '甲', ''],
          ['b@example.com', '乙', '0987654321'],
        ]),
      ),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toMatchObject({ rowNumber: 2, reason: 'Email 格式不正確' });
    expect(body.created).toHaveLength(1);
    expect(siteUserCreate).toHaveBeenCalledTimes(1);
    expect(siteUserCreate).toHaveBeenCalledWith({ data: { userId: 21, siteId: 7, role: 'viewer' } });
  });

  it('rejects a request without a file', async () => {
    const response = await POST(importRequest(), context);

    expect(response.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('rejects a file that is not a template-shaped workbook', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'broken.xlsx');

    const response = await POST(importRequest(file), context);

    expect(response.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
    expect(siteUserCreate).not.toHaveBeenCalled();
  });

  it('rejects a workbook without the required header', async () => {
    const response = await POST(
      importRequest(
        await memberFile([
          ['Name', 'Mail'],
          ['王小明', 'a@example.com'],
        ]),
      ),
      context,
    );

    expect(response.status).toBe(400);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('never links members to another site', async () => {
    await POST(importRequest(await memberFile(validRows)), context);

    for (const call of siteUserCreate.mock.calls) {
      expect((call[0] as { data: { siteId: number } }).data.siteId).toBe(7);
    }
  });
});
