import { describe, expect, it } from 'vitest';
import { getSiteAdminFeatureLinks, mergeSiteFeatures } from './features';

describe('site feature settings', () => {
  it('creates ordered admin menu links for every enabled system and custom feature', () => {
    expect(getSiteAdminFeatureLinks('site-a', [
      { key: 'announcements', path: 'announcement', label: '公告欄', icon: '📢' },
      { key: 'custom', path: 'faq-center', label: '常見問題', icon: '❓' },
    ])).toEqual([
      { href: '/site-a/admin/announcement', label: '公告欄', icon: '📢' },
      { href: '/site-a/admin/faq-center', label: '常見問題', icon: '❓' },
    ]);
  });

  it('keeps catalog fields and applies site settings including visibility', () => {
    expect(
      mergeSiteFeatures(
        [
          { id: 1, key: 'announcements', label: '公告欄', icon: '📢', path: 'announcement', displayMode: 'list' },
          { id: 2, key: 'progress', label: '都更進度', icon: '📈', path: 'progress', displayMode: 'card' },
        ],
        [{ featureId: 2, enabled: false, sortOrder: 4, displayMode: 'grid', visibility: 'members' }],
      ),
    ).toEqual([
      {
        id: 1,
        key: 'announcements',
        label: '公告欄',
        icon: '📢',
        path: 'announcement',
        displayMode: 'list',
        enabled: false,
        sortOrder: 0,
        visibility: 'public',
      },
      {
        id: 2,
        key: 'progress',
        label: '都更進度',
        icon: '📈',
        path: 'progress',
        displayMode: 'grid',
        enabled: false,
        sortOrder: 4,
        visibility: 'members',
      },
    ]);
  });
});
