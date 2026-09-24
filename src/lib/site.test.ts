import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findMany, findFirst } = vi.hoisted(() => ({ findMany: vi.fn(), findFirst: vi.fn() }))

vi.mock('./prisma', () => ({
  prisma: {
    siteFeature: { findMany, findFirst },
  },
}))

import { getEnabledFeatureByPath, getEnabledFeatures, getPublicNavigationFeatures } from './site'

describe('site feature helpers', () => {
  beforeEach(() => {
    findMany.mockReset()
    findFirst.mockReset()
  })

  it('looks up an enabled feature by its sub-site route path', async () => {
    const feature = {
      enabled: true,
      feature: { key: 'custom_info', label: '專案資訊', path: 'project-info', description: '專案說明' },
    }
    findFirst.mockResolvedValue(feature)

    await expect(getEnabledFeatureByPath(7, 'project-info')).resolves.toEqual(feature)
    expect(findFirst).toHaveBeenCalledWith({
      where: { siteId: 7, enabled: true, feature: { path: 'project-info' } },
      include: { feature: true },
    })
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
