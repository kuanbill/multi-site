import { type NextAuthOptions, DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'
import { isUnlimitedEditor } from './roles'
import { siteAuthCookies } from './authCookies'

export type SiteRole = { siteId: number; slug: string; role: string }

declare module 'next-auth' {
  interface User {
    id: string
    role: string
    allSites?: boolean
    siteRoles?: SiteRole[]
    authType?: 'site' | 'admin'
  }

  interface Session {
    user: {
      id: string
      role: string
      allSites?: boolean
      siteRoles: SiteRole[]
      authType?: 'site' | 'admin'
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    allSites?: boolean
    siteRoles: SiteRole[]
    authType?: 'site' | 'admin'
  }
}

export const siteAuthOptions: NextAuthOptions = {
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
          const isUnlimited = isUnlimitedEditor(user)
          if (!membership && !isAdmin && !isUnlimited) throw new Error('此帳號不屬於該專案')
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
          authType: 'site' as const,
          allSites: user.allSites === true,
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
        token.allSites = (user as unknown as { allSites?: boolean }).allSites === true
        token.siteRoles = ((user as unknown as { siteRoles: SiteRole[] }).siteRoles ?? []) as SiteRole[]
        token.authType = 'site'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.allSites = token.allSites === true
        session.user.siteRoles = (token.siteRoles as SiteRole[]) ?? []
        session.user.authType = token.authType
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  events: {
    // 登入成功寫入登入紀錄；失敗不影響登入流程
    async signIn({ user }) {
      try {
        const userId = Number(user.id)
        if (!Number.isFinite(userId)) return
        await prisma.loginRecord.create({ data: { userId } })
      } catch (error) {
        console.error('[auth] 登入紀錄寫入失敗', error)
      }
    }
  }
}

siteAuthOptions.cookies = siteAuthCookies

// Existing frontend imports keep working while making the authentication boundary explicit.
export const authOptions = siteAuthOptions

// Compatibility export while global admin routes are moved to the admin namespace.
export { getAdminSession } from './adminAuth'
