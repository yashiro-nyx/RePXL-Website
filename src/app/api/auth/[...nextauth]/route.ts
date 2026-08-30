import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          // Request basic profile + email — no extra scopes
          scope: 'openid email profile',
          prompt: 'select_account',
        },
      },
    }),
  ],

  pages: {
    signIn: '/login',
    error: '/login', // OAuth errors redirect to login page with ?error= param
  },

  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist provider info into the token on first sign-in
      if (account) {
        token.provider = account.provider
      }
      if (profile) {
        token.name = (profile as { name?: string }).name ?? token.name
      }
      return token
    },

    async session({ session, token }) {
      // Expose provider to the client session (not the secret)
      if (session.user) {
        (session.user as { id?: string; provider?: string }).id = token.sub ?? ''
        ;(session.user as { id?: string; provider?: string }).provider = (token.provider as string) ?? ''
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  // Use JWT strategy (no DB adapter needed)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
})

export { handler as GET, handler as POST }
