import { beforeEach, describe, expect, it, vi } from 'vitest';

const mkdir = vi.hoisted(() => vi.fn());
const writeFile = vi.hoisted(() => vi.fn());
const unlink = vi.hoisted(() => vi.fn());
const randomUUID = vi.hoisted(() => vi.fn(() => 'stored-media-id'));
const create = vi.hoisted(() => vi.fn());

vi.mock('node:fs/promises', () => ({ mkdir, writeFile, unlink }));
vi.mock('node:crypto', () => ({ randomUUID }));
vi.mock('./prisma', () => ({ prisma: { media: { create } } }));

import { saveMedia } from './media';

describe('media storage', () => {
  beforeEach(() => {
    process.env.UPLOAD_DIR = 'test-uploads';
    mkdir.mockReset();
    writeFile.mockReset();
    unlink.mockReset();
    unlink.mockResolvedValue(undefined);
    create.mockReset();
    create.mockResolvedValue({ id: 11 });
  });

  it('stores media with a generated filename and metadata', async () => {
    const file = new File(['pdf bytes'], '../../client-name.pdf', { type: 'application/pdf' });

    await expect(saveMedia(7, file, '會議紀錄')).resolves.toEqual({ id: 11 });
    expect(mkdir).toHaveBeenCalledWith('test-uploads', { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringContaining('stored-media-id.pdf'),
      expect.any(Buffer),
      { flag: 'wx' },
    );
    expect(writeFile.mock.calls[0][0]).not.toContain('client-name');
    expect(create).toHaveBeenCalledWith({
      data: {
        siteId: 7,
        filename: 'stored-media-id.pdf',
        url: '/uploads/stored-media-id.pdf',
        type: 'pdf',
        mimeType: 'application/pdf',
        sizeBytes: 9,
        altText: '會議紀錄',
      },
    });
  });

  it('removes the written file when media persistence fails', async () => {
    create.mockRejectedValue(new Error('database failure'));

    await expect(saveMedia(7, new File(['image'], 'hero.png', { type: 'image/png' }))).rejects.toThrow(
      'database failure',
    );
    expect(unlink).toHaveBeenCalledWith(expect.stringContaining('stored-media-id.png'));
  });
});
