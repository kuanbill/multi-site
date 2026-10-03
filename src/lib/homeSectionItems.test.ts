import { describe, expect, it } from 'vitest';
import { buildSectionTitle, resolveSectionListPath, toSectionItems } from './homeSectionItems';

const feature = { id: 3, key: 'faq', path: 'faq-center', label: '常見問題' };

describe('toSectionItems', () => {
  it('maps feature entries with their image and link', () => {
    const items = toSectionItems('feature', 'site-a', feature, [
      {
        id: 9,
        title: '問答一',
        content: '內容',
        contentType: 'image',
        youtubeUrl: null,
        media: { url: '/uploads/a.jpg', altText: '圖說' },
      },
    ]);

    expect(items).toEqual([
      {
        id: 'feature-9',
        title: '問答一',
        excerpt: '內容',
        href: '/site-a/faq-center/9',
        imageUrl: '/uploads/a.jpg',
        badge: null,
        meta: null,
      },
    ]);
  });

  it('marks a youtube entry without an image', () => {
    const items = toSectionItems('feature', 'site-a', feature, [
      { id: 9, title: '影片', content: null, contentType: 'youtube', youtubeUrl: 'x', media: null },
    ]);

    expect(items[0].imageUrl).toBeNull();
    expect(items[0].badge).toBe('YouTube 影片');
    expect(items[0].excerpt).toBeNull();
  });

  it('maps announcements with a pinned badge and publish date', () => {
    const items = toSectionItems('announcement', 'site-a', null, [
      {
        id: 2,
        title: '公告',
        slug: 'notice',
        summary: '摘要',
        content: null,
        category: '公告',
        pinned: true,
        publishedAt: new Date('2026-10-01T00:00:00Z'),
      },
    ]);

    expect(items).toEqual([
      {
        id: 'announcement-2',
        title: '公告',
        excerpt: '摘要',
        href: '/site-a/announcement/notice',
        imageUrl: null,
        badge: '置頂',
        meta: '2026/10/1',
      },
    ]);
  });

  it('falls back to content and shows the category when not pinned', () => {
    const items = toSectionItems('announcement', 'site-a', null, [
      {
        id: 2,
        title: '公告',
        slug: 'notice',
        summary: null,
        content: '內文',
        category: '公告',
        pinned: false,
        publishedAt: null,
      },
    ]);

    expect(items[0].badge).toBe('公告');
    expect(items[0].meta).toBeNull();
    expect(items[0].excerpt).toBe('內文');
  });

  it('maps progress items with a status badge', () => {
    const items = toSectionItems('progress', 'site-a', null, [
      {
        id: 4,
        stageLabel: '第一階段',
        title: '拆除',
        summary: '進行中',
        progressStatus: 'current',
        stageDate: new Date('2026-09-01T00:00:00Z'),
      },
    ]);

    expect(items).toEqual([
      {
        id: 'progress-4',
        title: '第一階段 - 拆除',
        excerpt: '進行中',
        href: '/site-a/progress',
        imageUrl: null,
        badge: '進行中',
        meta: '2026/9/1',
      },
    ]);
  });

  it('maps pages to their detail links', () => {
    const items = toSectionItems('page', 'site-a', null, [
      { id: 6, title: '關於我們', slug: 'about', content: null },
    ]);

    expect(items).toEqual([
      {
        id: 'page-6',
        title: '關於我們',
        excerpt: null,
        href: '/site-a/pages/about',
        imageUrl: null,
        badge: null,
        meta: null,
      },
    ]);
  });

  it('truncates a long excerpt and leaves short text untouched', () => {
    const [truncated] = toSectionItems('page', 'site-a', null, [
      { id: 6, title: '長文', slug: 'long', content: 'x'.repeat(200) },
    ]);

    expect(truncated.excerpt).toHaveLength(123);
    expect(truncated.excerpt?.endsWith('...')).toBe(true);

    const [short] = toSectionItems('page', 'site-a', null, [
      { id: 7, title: '短文', slug: 'short', content: '短' },
    ]);
    expect(short.excerpt).toBe('短');
  });

  it('returns an empty list when there is no data', () => {
    expect(toSectionItems('page', 'site-a', null, [])).toEqual([]);
  });
});

describe('resolveSectionListPath', () => {
  it('points each source at its listing page', () => {
    expect(resolveSectionListPath('announcement', 'site-a', null)).toBe('/site-a/announcement');
    expect(resolveSectionListPath('progress', 'site-a', null)).toBe('/site-a/progress');
    expect(resolveSectionListPath('page', 'site-a', null)).toBe('/site-a/pages');
  });

  it('points a feature section at the feature path', () => {
    expect(resolveSectionListPath('feature', 'site-a', feature)).toBe('/site-a/faq-center');
  });

  it('returns null when the feature path is unknown', () => {
    expect(resolveSectionListPath('feature', 'site-a', null)).toBeNull();
  });
});

describe('buildSectionTitle', () => {
  it('prefers the custom title', () => {
    expect(buildSectionTitle('本週公告', '公告欄')).toBe('本週公告');
  });

  it('falls back to the source label for blank titles', () => {
    expect(buildSectionTitle(null, '公告欄')).toBe('公告欄');
    expect(buildSectionTitle('   ', '都更進度')).toBe('都更進度');
  });
});