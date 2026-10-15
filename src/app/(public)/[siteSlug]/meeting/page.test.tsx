import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findManyMeetings = vi.hoisted(() => vi.fn());
const findManyAttachments = vi.hoisted(() => vi.fn());
const findFirstSiteFeature = vi.hoisted(() => vi.fn());
const requirePublicFeature = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({
  prisma: {
    meetingRecord: { findMany: findManyMeetings },
    contentAttachment: { findMany: findManyAttachments },
    siteFeature: { findFirst: findFirstSiteFeature },
  },
}));
vi.mock('@/lib/contentAccess', () => ({ requirePublicFeature }));

import PublicMeetingPage from './page';

describe('public meeting page', () => {
  beforeEach(() => {
    findManyMeetings.mockReset();
    findManyAttachments.mockReset();
    findFirstSiteFeature.mockReset();
    requirePublicFeature.mockReset();
    requirePublicFeature.mockResolvedValue({ site: { id: 8, name: '測試站點' }, publishedWhere: { status: 'published' } });
    findManyMeetings.mockResolvedValue([]);
    findManyAttachments.mockResolvedValue([]);
    findFirstSiteFeature.mockResolvedValue({ displayMode: 'list', feature: { displayMode: 'list' } });
  });

  it('wraps long meeting titles and preserves summary line breaks', async () => {
    findManyMeetings.mockResolvedValue([{
      id: 4,
      meetingType: 'board',
      meetingDate: new Date('2026-10-15T00:00:00.000Z'),
      meetingNo: 'LONG-MEETING-NUMBER-2026-000000000000000000',
      title: '這是一個很長且需要自動換行的會議標題'.repeat(4),
      summary: '第一行會議摘要\n第二行會議摘要',
    }]);

    const page = await PublicMeetingPage({ params: Promise.resolve({ siteSlug: 'alpha' }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('class="font-medium break-words"');
    expect(html).toContain('編號：LONG-MEETING-NUMBER-2026-000000000000000000');
    expect(html).toContain('whitespace-pre-wrap break-words');
    expect(html).toContain('第一行會議摘要\n第二行會議摘要');
  });
});
