export type FeatureAdminRoute = {
  featurePath: string;
  view: 'list' | 'new' | 'edit';
  entryId: number | null;
};

export function resolveFeatureAdminRouteSegments(segments: string[]): FeatureAdminRoute {
  const [featurePath, actionOrId, action] = segments;
  if (!featurePath || !/^[a-z0-9_-]+$/.test(featurePath)) throw new Error('Invalid feature admin route');

  if (segments.length === 1) {
    return { featurePath, view: 'list', entryId: null };
  }
  if (segments.length === 2 && actionOrId === 'new') {
    return { featurePath, view: 'new', entryId: null };
  }
  if (segments.length === 3 && action === 'edit' && /^[1-9]\d*$/.test(actionOrId)) {
    const entryId = Number(actionOrId);
    if (Number.isSafeInteger(entryId)) return { featurePath, view: 'edit', entryId };
  }

  throw new Error('Invalid feature admin route');
}
