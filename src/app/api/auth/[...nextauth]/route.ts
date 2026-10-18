import NextAuth from 'next-auth'
import { siteAuthOptions } from '@/lib/auth'
import { makeSessionCookieBrowserSession } from '@/lib/sessionCookie'

const handler = NextAuth(siteAuthOptions)

async function authHandler(...args: Parameters<typeof handler>) {
  const response = await handler(...args)
  const setCookieHeaders = response.headers.getSetCookie()

  if (setCookieHeaders.length > 0) {
    response.headers.delete('set-cookie')
    for (const cookie of makeSessionCookieBrowserSession(setCookieHeaders)) {
      response.headers.append('set-cookie', cookie)
    }
  }

  return response
}

export { authHandler as GET, authHandler as POST }
