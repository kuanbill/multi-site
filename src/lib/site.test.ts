import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findMany, findFirst, findUnique } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
}))

vi.mock('./prisma', () => ({
  prisma: {
    siteFeature: { findMany, findFirst },
    site: { findUnique },
  },
}))

import {
  clearSiteCache,
  getEnabledFeatureByPath,
  getEnabledFeatures,
  getPublicNavigationFeatures,
  getSiteBySlug,
} from './site'

describe('site feature helpers', () => {
  beforeEach(() => {
    findMany.mockReset()
    findFirst.mockReset()
    findUnique.mockReset()
    clearSiteCache()
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

  it('caches site lookups and serves them without hitting the database', async () => {
    findUnique.mockResolvedValue({ id: 7, slug: 'site-a', primaryColor: '#2563eb' })

    await expect(getSiteBySlug('site-a')).resolves.toMatchObject({ primaryColor: '#2563eb' })
    await expect(getSiteBySlug('site-a')).resolves.toMatchObject({ primaryColor: '#2563eb' })
    expect(findUnique).toHaveBeenCalledTimes(1)
  })

  it('re-reads from the database after clearSiteCache for that slug', async () => {
    findUnique.mockResolvedValue({ id: 7, slug: 'site-a', primaryColor: '#2563eb' })
    await getSiteBySlug('site-a')

    findUnique.mockResolvedValue({ id: 7, slug: 'site-a', primaryColor: '#0f766e' })
    clearSiteCache('site-a')

    await expect(getSiteBySlug('site-a')).resolves.toMatchObject({ primaryColor: '#0f766e' })
    expect(findUnique).toHaveBeenCalledTimes(2)
  })

  it('keeps cached entries for other slugs when clearing a single slug', async () => {
    findUnique.mockImplementation(({ where }: { where: { slug: string } }) =>
      Promise.resolve({ id: 1, slug: where.slug, primaryColor: '#000000' }),
    )
    await getSiteBySlug('site-a')
    await getSiteBySlug('site-b')

    clearSiteCache('site-a')
    await getSiteBySlug('site-a')
    await getSiteBySlug('site-b')

    expect(findUnique).toHaveBeenCalledTimes(3)
    expect(findUnique).toHaveBeenLastCalledWith({ where: { slug: 'site-a' } })
  })
})
