import { describe, expect, it } from 'vitest';
import { getImplementedAdminFeatures, mergeSiteFeatures } from './features';

describe('site feature settings', () => {
  it('only exposes feature links backed by implemented admin pages', () => {
    expect(getImplementedAdminFeatures([
      { key: 'announcements', path: 'announcement' },
      { key: 'posts', path: 'posts' },
      { key: 'maps', path: 'maps' },
      { key: 'custom', path: 'custom' },
    ])).toEqual([
      { key: 'announcements', path: 'announcement' },
      { key: 'maps', path: 'maps' },
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
