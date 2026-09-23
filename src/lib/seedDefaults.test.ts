import { describe, expect, it } from 'vitest'
import { buildFeatureDefinitionUpsert, buildNewSiteFeatureSettings, mergeSeedSites } from './seedDefaults'

describe('seed defaults', () => {
  it('assigns visibility defaults to new site feature rows without changing legacy enablement', () => {
    expect(buildNewSiteFeatureSettings([
      { id: 1, key: 'pages' },
      { id: 2, key: 'announcements' },
      { id: 3, key: 'meetings' },
      { id: 4, key: 'selection' },
    ])).toEqual([
      { featureId: 1, enabled: true, sortOrder: 0, visibility: 'public' },
      { featureId: 2, enabled: false, sortOrder: 1, visibility: 'public' },
      { featureId: 3, enabled: false, sortOrder: 2, visibility: 'members' },
      { featureId: 4, enabled: false, sortOrder: 3, visibility: 'members' },
    ])
  })

  it('does not update existing feature definitions', () => {
    const definition = {
      key: 'announcements',
      label: '公告欄',
      icon: '📢',
      path: 'announcement',
      isSystem: true,
      defaultVisibility: 'public',
    } as const

    expect(buildFeatureDefinitionUpsert(definition)).toEqual({
      where: { key: 'announcements' },
      update: {},
      create: {
        key: 'announcements',
        label: '公告欄',
        icon: '📢',
        path: 'announcement',
        isSystem: true,
      },
    })
  })

  it('merges known sample sites with every existing site once', () => {
    expect(mergeSeedSites([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }])).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ])
  })
})
