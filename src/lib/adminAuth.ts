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

        if (user.role !== 'admin') {
          throw new Error('只有全域管理員可以登入後台');
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          authType: 'admin' as const,
          siteRoles: [],
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
        token.siteRoles = [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.authType = token.authType;
        session.user.siteRoles = [];
        session.user.allSites = false;
      }
      return session;
    },
  },
  pages: { signIn: '/admin/login' },
};

export async function getAdminSession() {
  const session = await getServerSession(adminAuthOptions);
  if (!session || session.user.authType !== 'admin' || session.user.role !== 'admin') return null;

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'admin' ? session : null;
}
