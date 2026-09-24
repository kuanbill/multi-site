import { describe, expect, it } from 'vitest';
import { resolveFeatureAdminRouteSegments } from './featureAdminRoute';

describe('resolveFeatureAdminRouteSegments', () => {
  it('resolves the entry list route', () => {
    expect(resolveFeatureAdminRouteSegments(['faq-center'])).toEqual({
      featurePath: 'faq-center',
      view: 'list',
      entryId: null,
    });
  });

  it('resolves create and edit routes', () => {
    expect(resolveFeatureAdminRouteSegments(['faq-center', 'new'])).toEqual({
      featurePath: 'faq-center',
      view: 'new',
      entryId: null,
    });
    expect(resolveFeatureAdminRouteSegments(['faq-center', '12', 'edit'])).toEqual({
      featurePath: 'faq-center',
      view: 'edit',
      entryId: 12,
    });
  });

  it('rejects invalid entry ids and route shapes', () => {
    for (const segments of [[], ['faq-center', '0', 'edit'], ['faq-center', 'nope', 'edit'], ['faq-center', '12', 'delete']]) {
      expect(() => resolveFeatureAdminRouteSegments(segments)).toThrow('Invalid feature admin route');
    }
  });
});
