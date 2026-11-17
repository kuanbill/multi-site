import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from './prisma';
import { adminAuthCookies } from './authCookies';

export const adminAuthOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('請輸入帳號密碼');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !(await compare(credentials.password, user.password))) {
          throw new Error('帳號或密碼錯誤');
        }

        const siteUsers = user.role === 'editor'
          ? await prisma.siteUser.findMany({
            where: { userId: user.id },
            include: { site: { select: { id: true, slug: true } } },
          })
          : [];

        if (user.role === 'editor' && siteUsers.length === 0) {
          throw new Error('尚未指定可管理的子網站');
        }
        if (user.role !== 'admin' && user.role !== 'editor') {
          throw new Error('只有管理員或子網站管理者可以登入後台');
        }
        if (user.role === 'editor' && siteUsers.length !== 1) {
          throw new Error('只能指定一個子網站');
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          authType: 'admin' as const,
          siteRoles: siteUsers.map((siteUser) => ({
            siteId: siteUser.siteId,
            slug: siteUser.site.slug,
            role: siteUser.role,
          })),
        };
      },
    }),
  ],
  cookies: adminAuthCookies,
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.authType = 'admin';
        token.siteRoles = ((user as unknown as { siteRoles?: unknown[] }).siteRoles ?? []) as typeof token.siteRoles;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.authType = token.authType;
        session.user.siteRoles = token.siteRoles ?? [];
        session.user.allSites = false;
      }
      return session;
    },
  },
  pages: { signIn: '/admin/login' },
};

export async function getAdminSession() {
  const session = await getServerSession(adminAuthOptions);
  if (
    !session ||
    session.user.authType !== 'admin' ||
    !['admin', 'editor'].includes(session.user.role)
  ) return null;

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== session.user.role) return null;

  if (session.user.role === 'editor') {
    const siteUsers = await prisma.siteUser.findMany({
      where: { userId },
      include: { site: { select: { id: true, slug: true } } },
    });
    if (siteUsers.length !== 1) return null;
    session.user.siteRoles = siteUsers.map((siteUser) => ({
      siteId: siteUser.siteId,
      slug: siteUser.site.slug,
      role: siteUser.role,
    }));
  }

  return session;
}

export async function getGlobalAdminSession() {
  const session = await getAdminSession();
  return session?.user.role === 'admin' ? session : null;
}
