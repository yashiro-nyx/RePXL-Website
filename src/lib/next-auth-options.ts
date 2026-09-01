import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

/**
 * Shared NextAuth options — used by:
 *   - /api/auth/[...nextauth]/route.ts  (the NextAuth handler)
 *   - /api/auth/oauth/login/route.ts    (server-side session verification)
 *   - /api/auth/oauth/register/route.ts (server-side session verification)
 *
 * Exporting the options separately lets getServerSession() verify the
 * NextAuth JWT without importing the full handler.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'select_account',
        },
      },
    }),
  ],

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider
      }
      if (profile) {
        token.name = (profile as { name?: string }).name ?? token.name
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; provider?: string }).id = token.sub ?? ''
        ;(session.user as { id?: string; provider?: string }).provider =
          (token.provider as string) ?? ''
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}
