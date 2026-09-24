import { describe, expect, it } from 'vitest';
import { buildYouTubeEmbedUrl } from './featureEntryValidation';
import { getFeatureEntryLayoutClass, resolveFeatureEntryRouteSegments } from './featureEntryDisplay';

describe('feature entry public display', () => {
  it('resolves the feature list route', () => {
    expect(resolveFeatureEntryRouteSegments(['gallery'])).toEqual({ featurePath: 'gallery', entryId: null });
  });

  it('resolves a positive numeric entry detail route', () => {
    expect(resolveFeatureEntryRouteSegments(['gallery', '12'])).toEqual({ featurePath: 'gallery', entryId: 12 });
  });

  it('rejects invalid path shapes and entry identifiers', () => {
    for (const segments of [[], ['gallery', '0'], ['gallery', '1.5'], ['gallery', 'nope'], ['gallery', '1', 'extra']]) {
      expect(() => resolveFeatureEntryRouteSegments(segments)).toThrow('Invalid feature entry route');
    }
  });

  it('renders YouTube through a validated privacy-enhanced embed URL', () => {
    const videoId = 'dQw4w9WgXcQ';
    expect(buildYouTubeEmbedUrl(videoId)).toBe(`https://www.youtube-nocookie.com/embed/${videoId}`);
  });

  it('provides distinct list, card, and grid layouts', () => {
    expect(getFeatureEntryLayoutClass('list')).toBe('space-y-4');
    expect(getFeatureEntryLayoutClass('card')).toBe('grid grid-cols-1 md:grid-cols-2 gap-4');
    expect(getFeatureEntryLayoutClass('grid')).toBe('grid grid-cols-2 md:grid-cols-3 gap-4');
  });
});
