export type FeatureEntryRouteSegments = {
  featurePath: string;
  entryId: number | null;
};

export function getFeatureEntryLayoutClass(displayMode: string): string {
  if (displayMode === 'list') return 'space-y-4';
  if (displayMode === 'grid') return 'grid grid-cols-2 md:grid-cols-3 gap-4';
  return 'grid grid-cols-1 md:grid-cols-2 gap-4';
}

export function resolveFeatureEntryRouteSegments(segments: string[]): FeatureEntryRouteSegments {
  const [featurePath, rawEntryId] = segments;
  if (!featurePath || !/^[a-z0-9_-]+$/.test(featurePath)) throw new Error('Invalid feature entry route');
  if (segments.length === 1) return { featurePath, entryId: null };
  if (segments.length === 2 && rawEntryId && /^[1-9]\d*$/.test(rawEntryId)) {
    const entryId = Number(rawEntryId);
    if (Number.isSafeInteger(entryId)) return { featurePath, entryId };
  }
  throw new Error('Invalid feature entry route');
}
