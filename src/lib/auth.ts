import { getServerSession, NextAuthOptions, DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'

export type SiteRole = { siteId: number; slug: string; role: string }

declare module 'next-auth' {
  interface User {
    id: string
    role: string
    siteRoles?: SiteRole[]
  }

  interface Session {
    user: {
      id: string
      role: string
      siteRoles: SiteRole[]
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    siteRoles: SiteRole[]
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        siteSlug: { label: 'SiteSlug', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('請輸入帳號密碼')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          throw new Error('帳號不存在')
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('密碼錯誤')
        }

        const siteSlug = (credentials as Record<string, string>).siteSlug
        if (siteSlug) {
          const site = await prisma.site.findUnique({ where: { slug: siteSlug } })
          if (!site) throw new Error('專案不存在')
          const membership = await prisma.siteUser.findFirst({
            where: { userId: user.id, siteId: site.id }
          })
          const isAdmin = user.role === 'admin'
          if (!membership && !isAdmin) throw new Error('此帳號不屬於該專案')
        }

        const siteUsers = await prisma.siteUser.findMany({
          where: { userId: user.id },
          include: { site: { select: { id: true, slug: true } } }
        })
        const siteRoles: SiteRole[] = siteUsers.map((su) => ({
          siteId: su.siteId,
          slug: su.site.slug,
          role: su.role,
        }))

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          siteRoles,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: string }).role
        token.id = (user as unknown as { id: string }).id
        token.siteRoles = ((user as unknown as { siteRoles: SiteRole[] }).siteRoles ?? []) as SiteRole[]
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.siteRoles = (token.siteRoles as SiteRole[]) ?? []
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}

export async function getAdminSession() {
  const session = await getServerSession(authOptions)
  return session?.user.role === 'admin' ? session : null
}
