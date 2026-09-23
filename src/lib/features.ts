import type { FeatureVisibility } from './contentValidation'

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

type FeatureCatalogItem = {
  id: number
  key: string
  label: string
  icon: string | null
  path: string
  displayMode: string
}

type SiteFeatureSetting = {
  featureId: number
  enabled: boolean
  sortOrder: number
  displayMode: string
  visibility: FeatureVisibility
}

export function mergeSiteFeatures(catalog: FeatureCatalogItem[], settings: SiteFeatureSetting[]) {
  const settingMap = new Map(settings.map((setting) => [setting.featureId, setting]))
  return catalog.map((feature) => {
    const setting = settingMap.get(feature.id)
    const catalogItem = CONTENT_FEATURES.find((item) => item.key === feature.key)
    return {
      ...feature,
      enabled: setting?.enabled ?? false,
      sortOrder: setting?.sortOrder ?? 0,
      displayMode: setting?.displayMode ?? feature.displayMode ?? 'list',
      visibility: setting?.visibility ?? catalogItem?.defaultVisibility ?? 'public',
    }
  })
}
