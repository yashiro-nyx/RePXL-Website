// Compatibility endpoint used by useOAuthSync to refresh customer sessions.
// Reuse the verified Google login flow: require a server-validated NextAuth
// session and an existing, active customer. Never upsert from a submitted email.
export { POST } from './login/route'

export const dynamic = 'force-dynamic'
