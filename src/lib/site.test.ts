import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.hoisted(() => vi.fn())

vi.mock('./prisma', () => ({
  prisma: {
    siteFeature: { findMany },
  },
}))

import { getEnabledFeatures } from './site'

describe('site feature helpers', () => {
  beforeEach(() => {
    findMany.mockReset()
  })

  it('keeps site feature visibility when returning enabled navigation features', async () => {
    findMany.mockResolvedValue([
      {
        visibility: 'members',
        feature: { key: 'meetings', label: '會議記錄', path: 'meeting' },
      },
    ])

    await expect(getEnabledFeatures(7)).resolves.toEqual([
      { key: 'meetings', label: '會議記錄', path: 'meeting', visibility: 'members' },
    ])
    expect(findMany).toHaveBeenCalledWith({
      where: { siteId: 7, enabled: true },
      include: { feature: true },
      orderBy: { sortOrder: 'asc' },
    })
  })
})
