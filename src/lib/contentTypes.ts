export const CONTENT_STATUSES = ['draft', 'published', 'archived'] as const
export type ContentStatus = (typeof CONTENT_STATUSES)[number]

export const FEATURE_VISIBILITIES = ['public', 'members'] as const
export type FeatureVisibility = (typeof FEATURE_VISIBILITIES)[number]

export const MEETING_TYPES = ['board', 'general', 'other'] as const
export type MeetingType = (typeof MEETING_TYPES)[number]
