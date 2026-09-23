import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.hoisted(() => vi.fn())

vi.mock('./prisma', () => ({
  prisma: {
    siteFeature: { findMany },
  },
}))

import { getEnabledFeatures, getPublicNavigationFeatures } from './site'

describe('site feature helpers', () => {
  beforeEach(() => {
    findMany.mockReset()
  })

  it('keeps site feature visibility when returning enabled navigation features', async () => {
    findMany.mockResolvedValue([
      {
        visibility: 'members',
        enabled: true,
        sortOrder: 3,
        feature: { key: 'meetings', label: '會議記錄', path: 'meeting' },
      },
    ])

    await expect(getEnabledFeatures(7)).resolves.toEqual([
      { key: 'meetings', label: '會議記錄', path: 'meeting', enabled: true, sortOrder: 3, visibility: 'members' },
    ])
    expect(findMany).toHaveBeenCalledWith({
      where: { siteId: 7, enabled: true },
      include: { feature: true },
      orderBy: { sortOrder: 'asc' },
    })
  })

  it('sorts public navigation by site order and excludes disabled features', () => {
    expect(getPublicNavigationFeatures([
      { key: 'later', label: '較後', path: 'later', enabled: true, sortOrder: 8 },
      { key: 'hidden', label: '隱藏', path: 'hidden', enabled: false, sortOrder: 0 },
      { key: 'first', label: '最前', path: 'first', enabled: true, sortOrder: 2 },
    ])).toEqual([
      { key: 'first', label: '最前', path: 'first', enabled: true, sortOrder: 2 },
      { key: 'later', label: '較後', path: 'later', enabled: true, sortOrder: 8 },
    ])
  })
})
