import { describe, expect, it, vi } from 'vitest';
import {
  parseGoogleDriveUrls,
  readContentExternalLinks,
  syncContentExternalLinks,
} from './contentExternalLinks';

const firstUrl = 'https://drive.google.com/file/d/abc/view?usp=sharing';
const secondUrl = 'https://www.drive.google.com/open?id=xyz';

describe('parseGoogleDriveUrls', () => {
  it('accepts Google Drive URLs and preserves their query strings', () => {
    expect(parseGoogleDriveUrls([`  ${firstUrl}  `, secondUrl])).toEqual([firstUrl, secondUrl]);
  });

  it('ignores empty rows, removes duplicates, and preserves first-seen order', () => {
    expect(parseGoogleDriveUrls([` ${firstUrl} `, '', firstUrl, secondUrl, '   '])).toEqual([
      firstUrl,
      secondUrl,
    ]);
  });

  it.each([
    'http://drive.google.com/file/d/abc/view',
    'https://drive.google.com.evil.example/file/d/abc/view',
    'javascript:alert(1)',
    123,
    ['https://drive.google.com/file/d/abc/view', 123],
  ])('rejects invalid value %j', (value) => {
    expect(() => parseGoogleDriveUrls(value)).toThrow('Google Drive 連結格式無效');
  });
});

describe('content external link persistence helpers', () => {
  it('replaces links in the submitted order and clears them for an empty list', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 2 });
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const tx = { contentExternalLink: { deleteMany, createMany } };

    await syncContentExternalLinks(tx, {
      siteId: 7,
      ownerType: 'announcement',
      ownerId: 11,
      urls: [firstUrl, secondUrl],
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: { siteId: 7, ownerType: 'announcement', ownerId: 11 },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { siteId: 7, ownerType: 'announcement', ownerId: 11, url: firstUrl, sortOrder: 0 },
        { siteId: 7, ownerType: 'announcement', ownerId: 11, url: secondUrl, sortOrder: 1 },
      ],
    });

    createMany.mockClear();
    await syncContentExternalLinks(tx, {
      siteId: 7,
      ownerType: 'announcement',
      ownerId: 11,
      urls: [],
    });
    expect(deleteMany).toHaveBeenCalledTimes(2);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('reads links in sort order and then ID order', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 2, url: secondUrl, sortOrder: 1 }]);
    const client = { contentExternalLink: { findMany } };

    await expect(
      readContentExternalLinks(client, { siteId: 7, ownerType: 'announcement', ownerId: 11 }),
    ).resolves.toEqual([{ id: 2, url: secondUrl, sortOrder: 1 }]);
    expect(findMany).toHaveBeenCalledWith({
      where: { siteId: 7, ownerType: 'announcement', ownerId: 11 },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, url: true, sortOrder: true },
    });
  });
});
