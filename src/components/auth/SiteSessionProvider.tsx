'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

export const SITE_AUTH_BASE_PATH = '/api/auth';

export default function SiteSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider basePath={SITE_AUTH_BASE_PATH} session={session}>
      {children}
    </SessionProvider>
  );
}
