/**
 * Unit tests for the recent re-authentication system (Part 1).
 * These tests cover pure/library-level logic — no DB or cookie I/O needed.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// ── auth-helpers: recent-auth exported names ──────────────────────────────────

describe('recent-auth helpers are exported from auth-helpers', () => {
  it('exports RECENT_AUTH_COOKIE and RECENT_AUTH_WINDOW_MS', () => {
    const src = readFileSync('src/lib/auth-helpers.ts', 'utf8')
    expect(src).toContain('RECENT_AUTH_COOKIE')
    expect(src).toContain('RECENT_AUTH_WINDOW_MS')
  })

  it('setRecentAuthCookie uses HttpOnly + SameSite=strict cookie', () => {
    const src = readFileSync('src/lib/auth-helpers.ts', 'utf8')
    // Must be httpOnly and sameSite strict for security
    expect(src).toContain('httpOnly: true')
    expect(src).toContain("sameSite: 'strict'")
    expect(src).toContain('RECENT_AUTH_WINDOW_MS')
  })

  it('requireRecentAuth returns 401 on failure', () => {
    const src = readFileSync('src/lib/auth-helpers.ts', 'utf8')
    expect(src).toContain('status: 401')
    expect(src).toContain('RECENT_AUTH_REQUIRED')
  })

  it('recordRecentAuthFailure implements attempt limiting with window reset', () => {
    const src = readFileSync('src/lib/auth-helpers.ts', 'utf8')
    expect(src).toContain('RECENT_AUTH_MAX_ATTEMPTS')
    expect(src).toContain('RECENT_AUTH_ATTEMPT_WINDOW_MS')
    expect(src).toContain('windowExpired')
  })

  it('clearRecentAuthCookie is called by logout route', () => {
    const logout = readFileSync('src/app/api/auth/logout/route.ts', 'utf8')
    expect(logout).toContain('clearRecentAuthCookie')
  })
})

// ── /api/auth/recent-auth route ───────────────────────────────────────────────

describe('/api/auth/recent-auth route security contracts', () => {
  it('POST route derives userId from getCurrentUser session — never from body', () => {
    const src = readFileSync('src/app/api/auth/recent-auth/route.ts', 'utf8')
    expect(src).toContain('getCurrentUser')
    // userId must NOT be read from the request body
    expect(src).not.toContain('body.userId')
    expect(src).not.toContain('req.body.userId')
  })

  it('POST route enforces sameOrigin CSRF check', () => {
    const src = readFileSync('src/app/api/auth/recent-auth/route.ts', 'utf8')
    expect(src).toContain('sameOrigin')
  })

  it('POST route supports both password and google methods', () => {
    const src = readFileSync('src/app/api/auth/recent-auth/route.ts', 'utf8')
    expect(src).toContain("method === 'password'")
    expect(src).toContain("method === 'google'")
  })

  it('POST route checks attempt lock before bcrypt work', () => {
    const src = readFileSync('src/app/api/auth/recent-auth/route.ts', 'utf8')
    expect(src).toContain('isRecentAuthLocked')
    // Lock check must appear before bcrypt.compare
    const lockIdx   = src.indexOf('isRecentAuthLocked')
    const bcryptIdx = src.indexOf('bcrypt.compare')
    expect(lockIdx).toBeLessThan(bcryptIdx)
  })

  it('POST route returns 429 when account is locked', () => {
    const src = readFileSync('src/app/api/auth/recent-auth/route.ts', 'utf8')
    expect(src).toContain('429')
    expect(src).toContain('Too many failed attempts')
  })

  it('POST google method validates primaryAt against RECENT_AUTH_WINDOW_MS — no client userId', () => {
    const src = readFileSync('src/app/api/auth/recent-auth/route.ts', 'utf8')
    expect(src).toContain('customerPrimaryAuthTime')
    expect(src).toContain('RECENT_AUTH_WINDOW_MS')
    // primaryAt must NOT come from the request body
    expect(src).not.toContain('body.primaryAt')
  })

  it('GET route returns { verified: false } when no recent-auth exists', () => {
    const src = readFileSync('src/app/api/auth/recent-auth/route.ts', 'utf8')
    expect(src).toContain('verified: false')
    expect(src).toContain('verified: true')
  })
})

// ── change-password and MFA routes protected ─────────────────────────────────

describe('sensitive API routes enforce requireRecentAuth', () => {
  it('change-password route calls requireRecentAuth before processing', () => {
    const src = readFileSync('src/app/api/auth/change-password/route.ts', 'utf8')
    expect(src).toContain('requireRecentAuth')
    // requireRecentAuth must appear before bcrypt.compare
    const recentIdx = src.indexOf('requireRecentAuth')
    const bcryptIdx = src.indexOf('bcrypt.compare')
    expect(recentIdx).toBeLessThan(bcryptIdx)
  })

  it('MFA route calls requireRecentAuth for begin/disable/regenerate', () => {
    const src = readFileSync('src/app/api/auth/mfa/route.ts', 'utf8')
    expect(src).toContain('requireRecentAuth')
    expect(src).toContain('RECENT_AUTH_REQUIRED_ACTIONS')
    expect(src).toContain("'begin'")
    expect(src).toContain("'disable'")
    expect(src).toContain("'regenerate'")
  })

  it('MFA route returns RECENT_AUTH_REQUIRED error code when gate fails', () => {
    const src = readFileSync('src/app/api/auth/mfa/route.ts', 'utf8')
    expect(src).toContain('RECENT_AUTH_REQUIRED')
  })
})

// ── SecurityGate component ────────────────────────────────────────────────────

describe('SecurityGate component', () => {
  it('exists and uses GET /api/auth/recent-auth to check status', () => {
    const src = readFileSync('src/components/account/SecurityGate.tsx', 'utf8')
    expect(src).toContain('/api/auth/recent-auth')
  })

  it('uses POST /api/auth/recent-auth to verify identity', () => {
    const src = readFileSync('src/components/account/SecurityGate.tsx', 'utf8')
    expect(src).toContain("method: 'POST'")
    expect(src).toContain("method: 'password'")
    expect(src).toContain("method: 'google'")
  })

  it('shows Google re-auth path for Google-only accounts', () => {
    const src = readFileSync('src/components/account/SecurityGate.tsx', 'utf8')
    expect(src).toContain('gate-google')
    expect(src).toContain('Continue with Google')
  })

  it('shows password form for password accounts', () => {
    const src = readFileSync('src/components/account/SecurityGate.tsx', 'utf8')
    expect(src).toContain('gate-password')
    expect(src).toContain('Current Password')
  })

  it('wraps security pages: security, password, mfa', () => {
    const security  = readFileSync('src/app/(storefront)/account/security/page.tsx', 'utf8')
    const password  = readFileSync('src/app/(storefront)/account/security/password/page.tsx', 'utf8')
    const mfa       = readFileSync('src/app/(storefront)/account/security/mfa/page.tsx', 'utf8')
    expect(security).toContain('SecurityGate')
    expect(password).toContain('SecurityGate')
    expect(mfa).toContain('SecurityGate')
  })
})

// ── DB schema ─────────────────────────────────────────────────────────────────

describe('RecentAuthRecord DB model', () => {
  it('exists in schema.prisma with required fields', () => {
    const src = readFileSync('prisma/schema.prisma', 'utf8')
    expect(src).toContain('RecentAuthRecord')
    expect(src).toContain('recent_auth_records')
    expect(src).toContain('expiresAt')
    expect(src).toContain('attempts')
    expect(src).toContain('windowStart')
  })

  it('has cascade delete tied to User', () => {
    const src = readFileSync('prisma/schema.prisma', 'utf8')
    // The relation must be present (no orphaned records)
    expect(src).toContain('onDelete: Cascade')
  })
})
