import { describe, expect, it } from 'vitest';
import { mergeSiteFeatures } from './features';

describe('site feature settings', () => {
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
