export const CONTENT_FEATURES = [
  { key: 'announcements', label: '公告欄', icon: '📢', path: 'announcement', isSystem: true, defaultVisibility: 'public' },
  { key: 'progress', label: '都更進度', icon: '📈', path: 'progress', isSystem: true, defaultVisibility: 'public' },
  { key: 'exhibitions', label: '公開展覽', icon: '🖼️', path: 'exhibition', isSystem: true, defaultVisibility: 'public' },
  { key: 'meetings', label: '會議記錄', icon: '📝', path: 'meeting', isSystem: true, defaultVisibility: 'members' },
  { key: 'vendors', label: '協力廠商', icon: '🏢', path: 'vendors', isSystem: true, defaultVisibility: 'members' },
  { key: 'selection', label: '正式選配', icon: '🏠', path: 'selection', isSystem: true, defaultVisibility: 'members' },
  { key: 'maps', label: '相關圖資', icon: '🗺️', path: 'maps', isSystem: true, defaultVisibility: 'members' },
] as const

export type FeatureKey = (typeof CONTENT_FEATURES)[number]['key'] | string
