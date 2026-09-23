import { describe, expect, it } from 'vitest'
import { buildFeatureDefinitionUpsert, mergeSeedSites } from './seedDefaults'

describe('seed defaults', () => {
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
