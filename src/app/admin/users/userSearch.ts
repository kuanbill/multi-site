import type { Prisma } from '@prisma/client';

export type SearchParamValue = string | string[] | undefined;
export type UserListFilters = { q: string; siteId: number | null };

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
