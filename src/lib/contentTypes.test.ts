import { describe, expect, it } from 'vitest'
import { CONTENT_FEATURES } from './features'
import {
  CONTENT_STATUSES,
  FEATURE_VISIBILITIES,
  MEETING_TYPES,
} from './contentTypes'

describe('content defaults', () => {
  it('defines the seven site content features in navigation order', () => {
    expect(CONTENT_FEATURES.map(({ key, path, defaultVisibility }) => ({ key, path, defaultVisibility }))).toEqual([
      { key: 'announcements', path: 'announcement', defaultVisibility: 'public' },
      { key: 'progress', path: 'progress', defaultVisibility: 'public' },
      { key: 'exhibitions', path: 'exhibition', defaultVisibility: 'public' },
      { key: 'meetings', path: 'meeting', defaultVisibility: 'members' },
      { key: 'vendors', path: 'vendors', defaultVisibility: 'members' },
      { key: 'selection', path: 'selection', defaultVisibility: 'members' },
      { key: 'maps', path: 'maps', defaultVisibility: 'members' },
    ])
  })

  it('exposes the supported content enum values', () => {
    expect(CONTENT_STATUSES).toEqual(['draft', 'published', 'archived'])
    expect(FEATURE_VISIBILITIES).toEqual(['public', 'members'])
    expect(MEETING_TYPES).toEqual(['board', 'general', 'other'])
  })
})
