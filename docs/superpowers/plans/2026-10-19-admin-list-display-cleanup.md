# Admin List Display Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove inline role editing from the global user list and remove page and article count columns from the site management list.

**Architecture:** Keep role editing in the existing user edit page and API. Make the two list changes presentation-only, removing the unused site count selection from the server query and the unused client-side role selector.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Prisma, Vitest.

## Global Constraints

- Preserve the existing `roleLabel` display and edit-page/API role behavior.
- Do not change database schema, role values, authorization, or site member rules.
- Preserve unrelated working-tree changes and stage only files named by each task.
- Run tests with `npm test` or `npm exec vitest run`, then run TypeScript/build verification.

---

### Task 1: Add failing contracts for the two list changes

**Files:**
- Modify: `src/app/admin/responsiveGuiContracts.test.ts`

**Interfaces:**
- Consumes: Current source-file contract helper `readAdminFile`.
- Produces: Regression assertions that the global user list no longer imports `RoleSelect`, and the site list no longer contains count columns or `_count` selection.

- [ ] **Step 1: Write the failing tests**

Add these assertions to the existing `admin responsive list contracts` test after the current global user filter assertions:

```ts
expect(users).not.toContain("from './RoleSelect'");
expect(users).not.toContain('<RoleSelect');
expect(sites).not.toContain('頁面數');
expect(sites).not.toContain('文章數');
expect(sites).not.toContain('_count');
```

- [ ] **Step 2: Run the focused test and verify it fails for the expected reason**

Run:

```bash
npm exec vitest run src/app/admin/responsiveGuiContracts.test.ts
```

Expected: the new assertions fail because the current source still imports and renders `RoleSelect`, and the site list still selects and renders `_count.pages`, `_count.posts`, `頁面數`, and `文章數`.

### Task 2: Remove the two list-only UI behaviors

**Files:**
- Modify: `src/app/admin/users/page.tsx`
- Delete: `src/app/admin/users/RoleSelect.tsx`
- Modify: `src/app/admin/sites/page.tsx`

**Interfaces:**
- Consumes: Existing `roleLabel`, `User` query result, and `Site` query result.
- Produces: Static role text in the global list and a site list without page/article count data.

- [ ] **Step 1: Replace the global list role selector with text**

In `src/app/admin/users/page.tsx`:

```tsx
// remove the RoleSelect import
// keep: import { roleLabel } from '@/lib/roles'

<td className="px-6 py-4">{roleLabel(user.role)}</td>
```

Remove the `RoleSelect` JSX and its `currentUserId` value if it is no longer used. Keep the edit link and all existing role/site membership display behavior.

- [ ] **Step 2: Remove the unused role selector component**

Delete `src/app/admin/users/RoleSelect.tsx` after confirming `rg "RoleSelect" src` has no remaining production import or use. Keep the role update API because the edit page still owns role editing.

- [ ] **Step 3: Remove site count selection and cells**

In `src/app/admin/sites/page.tsx`:

```tsx
const sites = await prisma.site.findMany({
  orderBy: { createdAt: 'desc' },
})
```

Remove the `_count` include, the two count headers, and the two count `<td>` cells. Keep the remaining four columns and all existing links/buttons.

- [ ] **Step 4: Run the focused contracts and verify they pass**

Run:

```bash
npm exec vitest run src/app/admin/responsiveGuiContracts.test.ts
```

Expected: all tests pass, including the new absence assertions.

### Task 3: Run complete verification

**Files:**
- Inspect only: `src/app/admin/users/page.tsx`, `src/app/admin/sites/page.tsx`, `src/app/admin/responsiveGuiContracts.test.ts`

**Interfaces:**
- Consumes: The completed UI-only changes from Task 2.
- Produces: Verified test, TypeScript, lint, and production build results.

- [ ] **Step 1: Run the complete test suite**

Run:

```bash
npm test
```

Expected: Vitest exits with code 0 and no failed tests.

- [ ] **Step 2: Run TypeScript and lint checks**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: both commands exit with code 0 and no TypeScript errors or lint errors.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: Next.js production build exits with code 0.

- [ ] **Step 4: Review the scoped diff**

Run:

```bash
git diff -- src/app/admin/users/page.tsx src/app/admin/users/RoleSelect.tsx src/app/admin/sites/page.tsx src/app/admin/responsiveGuiContracts.test.ts
```

Confirm the diff contains only the requested list display changes and their tests; do not stage the existing user document or unrelated work.
