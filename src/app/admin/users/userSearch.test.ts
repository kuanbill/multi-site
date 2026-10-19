import { describe, expect, it } from 'vitest';
import { buildUserWhere, normalizeUserFilters } from './userSearch';

const sites = [
  { id: 1, name: '甲專案' },
  { id: 2, name: '乙專案' },
];

describe('normalizeUserFilters', () => {
  it('trims the keyword and keeps a known project id', () => {
    expect(normalizeUserFilters({ q: ' 王小明 ', site: '2' }, sites)).toEqual({
      q: '王小明',
      siteId: 2,
    });
  });

  it('ignores repeated, empty, non-numeric, and unknown project values', () => {
    expect(normalizeUserFilters({ q: ['  ', 'ignored'], site: 'not-a-number' }, sites)).toEqual({
      q: '',
      siteId: null,
    });
    expect(normalizeUserFilters({ site: '999' }, sites)).toEqual({ q: '', siteId: null });
  });
});

describe('buildUserWhere', () => {
  it('searches name, email, and related project name', () => {
    expect(buildUserWhere({ q: '專案', siteId: null })).toEqual({
      OR: [
        { name: { contains: '專案' } },
        { email: { contains: '專案' } },
        { sites: { some: { site: { name: { contains: '專案' } } } } },
      ],
    });
  });

  it('combines a keyword with a project membership filter', () => {
    expect(buildUserWhere({ q: '王', siteId: 2 })).toEqual({
      AND: [
        {
          OR: [
            { name: { contains: '王' } },
            { email: { contains: '王' } },
            { sites: { some: { site: { name: { contains: '王' } } } } },
          ],
        },
        { sites: { some: { siteId: 2 } } },
      ],
    });
  });

  it('returns an empty filter when no search controls are set', () => {
    expect(buildUserWhere({ q: '', siteId: null })).toEqual({});
  });
});
