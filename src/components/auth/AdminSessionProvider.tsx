'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';

export const ADMIN_AUTH_BASE_PATH = '/api/admin/auth';

export default function AdminSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider basePath={ADMIN_AUTH_BASE_PATH} session={session}>
      {children}
    </SessionProvider>
  );
}
