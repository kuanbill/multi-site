import { describe, expect, it } from 'vitest';
import { generateRandomSlug } from './slug';
import { validateSlug } from './contentValidation';

describe('generateRandomSlug', () => {
  it('matches the announcement slug validation pattern', () => {
    expect(generateRandomSlug()).toMatch(/^announcement-[a-f0-9]{12}$/);
    expect(() => validateSlug(generateRandomSlug())).not.toThrow();
  });

  it('produces unique values across calls', () => {
    const values = new Set(Array.from({ length: 50 }, () => generateRandomSlug()));
    expect(values.size).toBe(50);
  });
});
