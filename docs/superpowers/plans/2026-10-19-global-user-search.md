# Global User Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add URL-backed keyword search and project filtering to the global `/admin/users` list without changing existing role, edit, delete, or permission behavior.

**Architecture:** Keep the page as a dynamic Server Component. Parse `q` and `site` from the Next.js 16 `searchParams: Promise<...>` prop, load the available projects for the filter, and use a small pure helper to normalize filters and build a Prisma `UserWhereInput`. The existing user query and table remain in the page; no new API or database schema is needed.

**Tech Stack:** Next.js 16.3.5 App Router, React Server Components, Prisma SQLite, TypeScript, Vitest, Tailwind CSS.

## Global Constraints

- Use the current Next.js 16 async `searchParams` API: `searchParams: Promise<{ [key: string]: string | string[] | undefined }>`.
- Keep the feature limited to the global `/admin/users` page; do not change site member management.
- Do not add a database table, migration, or separate search API.
- Preserve direct role changes, edit/delete actions, and existing self-account and last-admin protections.
- Treat invalid or unknown `site` values as no project filter.
- Stage only files belonging to this feature; preserve unrelated worktree changes.

---

### Task 1: Add tested user-filter normalization and Prisma where builder

**Files:**
- Create: `src/app/admin/users/userSearch.ts`
- Test: `src/app/admin/users/userSearch.test.ts`

**Interfaces:**
- `normalizeUserFilters(searchParams, sites)` returns `{ q: string; siteId: number | null }`.
- `buildUserWhere(filters)` returns `Prisma.UserWhereInput` and matches `q` against user name, email, or related project name; when `siteId` is non-null it additionally requires membership in that project.

- [ ] **Step 1: Write the failing tests**

Create a Vitest unit test with real helper calls and no Prisma/database mocks:

```ts
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
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing helper**

Run:

```bash
rtk npm test -- src/app/admin/users/userSearch.test.ts
```

Expected: FAIL because `./userSearch` does not exist yet; the failure must be an import/module failure, not a test syntax error.

- [ ] **Step 3: Implement the minimal helper**

Create `userSearch.ts` with these behaviors:

```ts
import type { Prisma } from '@prisma/client';

export type UserListFilters = { q: string; siteId: number | null };
export type SearchParamValue = string | string[] | undefined;

export function normalizeUserFilters(
  searchParams: Record<string, SearchParamValue>,
  sites: Array<{ id: number }>,
): UserListFilters {
  const rawQuery = searchParams.q;
  const q = (typeof rawQuery === 'string' ? rawQuery : '').trim();
  const rawSite = searchParams.site;
  const parsedSite = typeof rawSite === 'string' ? Number.parseInt(rawSite, 10) : NaN;
  const siteId = Number.isInteger(parsedSite) && sites.some((site) => site.id === parsedSite)
    ? parsedSite
    : null;
  return { q, siteId };
}

export function buildUserWhere({ q, siteId }: UserListFilters): Prisma.UserWhereInput {
  const keywordWhere = q
    ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { sites: { some: { site: { name: { contains: q } } } } },
        ],
      }
    : null;
  const siteWhere = siteId === null ? null : { sites: { some: { siteId } } };
  if (keywordWhere && siteWhere) return { AND: [keywordWhere, siteWhere] };
  return keywordWhere ?? siteWhere ?? {};
}
```

Use the generated Prisma type so the relation shape is checked against the current schema. Do not add `mode: 'insensitive'`, which is not available in this project's generated SQLite `StringFilter`; SQLite's existing text matching behavior is the supported implementation here.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
rtk npm test -- src/app/admin/users/userSearch.test.ts
```

Expected: PASS with 5 tests.

- [ ] **Step 5: Commit the helper and tests**

```bash
rtk git add -- src/app/admin/users/userSearch.ts src/app/admin/users/userSearch.test.ts
rtk git commit -m "feat: add global user search filters"
```

### Task 2: Wire URL filters and project options into the global users page

**Files:**
- Modify: `src/app/admin/users/page.tsx:9-103`
- Test: `src/app/admin/responsiveGuiContracts.test.ts:12-23`

**Interfaces:**
- The page receives `searchParams: Promise<Record<string, string | string[] | undefined>>`.
- It passes normalized filters to `buildUserWhere` and uses the selected `siteId` to preserve the `<select>` value.

- [ ] **Step 1: Extend the page contract test with the required search UI**

Add assertions to the existing global-table contract test:

```ts
expect(users).toContain('method="GET"');
expect(users).toContain('name="q"');
expect(users).toContain('name="site"');
expect(users).toContain('搜尋姓名、Email 或專案名稱');
expect(users).toContain('清除');
expect(users).toContain('找不到符合條件的使用者');
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run:

```bash
rtk npm test -- src/app/admin/responsiveGuiContracts.test.ts
```

Expected: FAIL because the current page has no search form or empty-result text.

- [ ] **Step 3: Implement the page query and form**

Update the page to:

1. Import `buildUserWhere`, `normalizeUserFilters`, and `SearchParamValue` from `./userSearch`.
2. Accept and await `searchParams` using the Next.js 16 Promise shape.
3. Load all sites with `select: { id: true, name: true }`, ordered by `name asc`.
4. Normalize the query against the loaded site IDs.
5. Pass `where: buildUserWhere(filters)` to the existing `prisma.user.findMany` call; preserve the current `select`, `orderBy`, and role/site display logic.
6. Render a GET form between the title/actions row and the table, with a text input named `q`, a project select named `site`, a `搜尋` submit button, and a `/admin/users` `清除` link. Use `filters.q` and `filters.siteId` to populate the controls.
7. Render the existing table for non-empty results; when `users.length === 0`, render a table body row or adjacent message containing `找不到符合條件的使用者` while retaining the table headers.

Use existing responsive classes (`flex-wrap`, `min-h-11`, and the current table overflow container) so the added controls work on narrow screens. Do not change `RoleSelect`, `DeleteUserButton`, or edit links.

- [ ] **Step 4: Run the page contract test and verify it passes**

Run:

```bash
rtk npm test -- src/app/admin/responsiveGuiContracts.test.ts
```

Expected: PASS with all existing responsive contract tests.

- [ ] **Step 5: Commit the page wiring**

```bash
rtk git add -- src/app/admin/users/page.tsx src/app/admin/responsiveGuiContracts.test.ts
rtk git commit -m "feat: add search controls to global users"
```

### Task 3: Run complete verification and inspect the final diff

**Files:**
- Verify only: all feature files and the two implementation commits

- [ ] **Step 1: Run the focused feature tests together**

```bash
rtk npm test -- src/app/admin/users/userSearch.test.ts src/app/admin/responsiveGuiContracts.test.ts
```

Expected: PASS with no warnings or failed tests.

- [ ] **Step 2: Run the complete test suite**

```bash
rtk npm test
```

Expected: all existing tests pass.

- [ ] **Step 3: Run lint**

```bash
rtk npm run lint
```

Expected: ESLint exits successfully with no new errors.

- [ ] **Step 4: Inspect scope and worktree state**

```bash
rtk git diff origin/main...HEAD --stat
rtk git diff origin/main...HEAD --check
rtk git status --short --branch
```

Confirm only the design/plan documents and the scoped search helper, tests, and global users page changes are present; do not stage or modify unrelated files.

- [ ] **Step 5: Commit any verification-only fixes, if required**

If lint or tests require a correction, add only the affected feature files and use:

```bash
rtk git add -- <scoped-files>
rtk git commit -m "fix: verify global user search"
```
