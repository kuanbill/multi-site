import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const adminDirectory = dirname(fileURLToPath(import.meta.url));

function readAdminFile(...segments: string[]) {
  return readFileSync(join(adminDirectory, ...segments), 'utf8');
}

describe('admin responsive list contracts', () => {
  it('keeps global tables inside a horizontal scroll region with touch-friendly actions', () => {
    const sites = readAdminFile('sites', 'page.tsx');
    const users = readAdminFile('users', 'page.tsx');

    expect(sites).toContain('overflow-x-auto');
    expect(sites).toContain('min-w-[760px]');
    expect(sites).toContain('min-h-11');
    expect(users).toContain('overflow-x-auto');
    expect(users).toContain('min-w-[900px]');
    expect(users).toContain('min-h-11');
  });

  it('keeps site members and dashboard records usable on narrow screens', () => {
    const members = readAdminFile('sites', '[siteSlug]', 'users', 'SiteUsersClient.tsx');
    const dashboard = readAdminFile('sites', '[siteSlug]', 'page.tsx');
    const media = readAdminFile('sites', '[siteSlug]', 'media', 'MediaLibrary.tsx');

    expect(members).toContain('overflow-x-auto');
    expect(members).toContain('min-w-[760px]');
    expect(members).toContain('flex-wrap');
    expect(dashboard).toContain('overflow-x-auto');
    expect(dashboard).toContain('min-w-[560px]');
    expect(media).toContain('overflow-x-auto');
  });
});
