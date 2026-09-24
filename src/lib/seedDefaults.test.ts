import { describe, expect, it } from 'vitest'
import { buildFeatureDefinitionUpsert, buildNewSiteFeatureSettings, mergeSeedSites, shouldSeedDefaultFeatures } from './seedDefaults'

describe('seed defaults', () => {
  it('enables all default content features and preserves legacy enablement', () => {
    expect(buildNewSiteFeatureSettings([
      { id: 1, key: 'pages' },
      { id: 2, key: 'announcements' },
      { id: 3, key: 'meetings' },
      { id: 4, key: 'selection' },
    ])).toEqual([
      { featureId: 1, enabled: true, sortOrder: 0, visibility: 'public' },
      { featureId: 2, enabled: true, sortOrder: 1, visibility: 'public' },
      { featureId: 3, enabled: true, sortOrder: 2, visibility: 'members' },
      { featureId: 4, enabled: true, sortOrder: 3, visibility: 'members' },
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

  it('only seeds built-in definitions for a fresh database', () => {
    expect(shouldSeedDefaultFeatures(0, 0)).toBe(true)
    expect(shouldSeedDefaultFeatures(1, 0)).toBe(false)
    expect(shouldSeedDefaultFeatures(0, 1)).toBe(false)
  })

  it('merges known sample sites with every existing site once', () => {
    expect(mergeSeedSites([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 3 }])).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ])
  })
})
