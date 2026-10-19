# Frontend Link New Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the site management list's frontend link in a new tab or window.

**Architecture:** Keep the existing Next.js `Link` and URL. Add only safe external-window attributes and protect the opener with `rel="noopener noreferrer"`; do not change other list actions.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Vitest.

## Global Constraints

- Preserve the existing frontend URL, label, styling, and other management actions.
- Preserve unrelated working-tree changes and stage only files named by the task.
- Follow TDD by adding and observing a failing source contract before editing production code.

---

### Task 1: Add and verify the failing link contract

**Files:**
- Modify: `src/app/admin/responsiveGuiContracts.test.ts`

**Interfaces:**
- Consumes: Existing `readAdminFile` helper and site list source.
- Produces: Assertions requiring the frontend link to use a new browsing context and safe opener isolation.

- [ ] **Step 1: Write the failing assertions**

Add these assertions to the existing global list contract after the site table assertions:

```ts
expect(sites).toContain('href={`/${site.slug}`}');
expect(sites).toContain('target="_blank"');
expect(sites).toContain('rel="noopener noreferrer"');
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm exec vitest run src/app/admin/responsiveGuiContracts.test.ts
```

Expected: the new `target` assertion fails because the current frontend link has no `target` or `rel` attribute.

### Task 2: Add safe new-tab behavior

**Files:**
- Modify: `src/app/admin/sites/page.tsx`

**Interfaces:**
- Consumes: Existing `site.slug` frontend URL.
- Produces: A frontend link that opens separately and cannot access the opener window.

- [ ] **Step 1: Make the minimal production change**

Update only the frontend link:

```tsx
<Link
  href={`/${site.slug}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex min-h-11 items-center text-gray-600 hover:underline"
>
  前台
</Link>
```

Keep the management and edit links unchanged.

- [ ] **Step 2: Run the focused test and verify it passes**

Run:

```bash
npm exec vitest run src/app/admin/responsiveGuiContracts.test.ts
```

Expected: all tests in the file pass.

### Task 3: Run complete verification

**Files:**
- Inspect: `src/app/admin/sites/page.tsx`, `src/app/admin/responsiveGuiContracts.test.ts`

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all Vitest test files pass.

- [ ] **Step 2: Run type, lint, and production checks**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: TypeScript and build exit with code 0; lint has no errors.
