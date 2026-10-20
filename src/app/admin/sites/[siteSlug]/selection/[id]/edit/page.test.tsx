import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirst = vi.hoisted(() => vi.fn());
const findManyAttachments = vi.hoisted(() => vi.fn());
const findManyMedia = vi.hoisted(() => vi.fn());
const findManyExternalLinks = vi.hoisted(() => vi.fn());
const requireContentPermission = vi.hoisted(() => vi.fn());

vi.mock('@/lib/contentAccess', () => ({ requireContentPermission }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    selectionInfo: { findFirst },
    contentAttachment: { findMany: findManyAttachments },
    media: { findMany: findManyMedia },
    contentExternalLink: { findMany: findManyExternalLinks },
  },
}));
vi.mock('../../SelectionForm', () => ({
  default: ({ initial }: { initial: { driveUrls?: string[] } }) => (
    <div data-drive-urls={initial.driveUrls?.join('|') ?? ''}>selection form</div>
  ),
}));

import EditSelectionPage from './page';

describe('edit selection page', () => {
  beforeEach(() => {
    requireContentPermission.mockReset().mockResolvedValue({ site: { id: 7 } });
    findFirst.mockReset().mockResolvedValue({ id: 12, siteId: 7, title: '選配作業', status: 'draft' });
    findManyAttachments.mockReset().mockResolvedValue([]);
    findManyMedia.mockReset().mockResolvedValue([]);
    findManyExternalLinks.mockReset().mockResolvedValue([
      { id: 9, url: 'https://drive.google.com/file/d/existing/view', sortOrder: 0 },
    ]);
  });

  it('passes existing Google Drive URLs to the edit form', async () => {
    const page = await EditSelectionPage({
      params: Promise.resolve({ siteSlug: 'site-a', id: '12' }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('https://drive.google.com/file/d/existing/view');
  });
});
