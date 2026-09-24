import { describe, expect, it } from 'vitest';
import { generateFeatureKey } from './featureKey';

describe('generateFeatureKey', () => {
  it('creates a stable valid key for labels without ASCII letters or digits', () => {
    const key = generateFeatureKey('常見問題');

    expect(key).toMatch(/^feature_[a-f0-9]{12}$/);
    expect(generateFeatureKey('常見問題')).toBe(key);
  });

  it('keeps the existing slug format for English labels', () => {
    expect(generateFeatureKey('Project Updates')).toBe('project_updates');
  });
});
