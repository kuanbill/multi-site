import { CONTENT_FEATURES } from './features'

type FeatureDefinitionSeed = {
  key: string
  label: string
  icon: string
  path: string
  isSystem: boolean
  defaultVisibility: string
}

export function buildFeatureDefinitionUpsert(definition: FeatureDefinitionSeed) {
  return {
    where: { key: definition.key },
    update: {},
    create: {
      key: definition.key,
      label: definition.label,
      icon: definition.icon,
      path: definition.path,
      isSystem: definition.isSystem,
    },
  }
}

export function mergeSeedSites<T extends { id: number }>(knownSites: readonly T[], existingSites: readonly T[]) {
  const sites = new Map<number, T>()
  for (const site of [...knownSites, ...existingSites]) {
    sites.set(site.id, site)
  }
  return [...sites.values()]
}

export function buildNewSiteFeatureSettings(definitions: readonly { id: number; key: string }[]) {
  return definitions.map((definition, sortOrder) => ({
    featureId: definition.id,
    enabled: CONTENT_FEATURES.some((feature) => feature.key === definition.key)
      || ['pages', 'posts', 'media'].includes(definition.key),
    sortOrder,
    visibility: CONTENT_FEATURES.find((feature) => feature.key === definition.key)?.defaultVisibility ?? 'public',
  }))
}
