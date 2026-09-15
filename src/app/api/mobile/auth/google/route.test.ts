import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  findUniqueUser: vi.fn(),
  createUser: vi.fn(),
  findUniqueSession: vi.fn(),
  createSession: vi.fn(),
  findUniqueToken: vi.fn(),
  createToken: vi.fn(),
}))

vi.mock('@/lib/retired-auth-email', () => ({
  isRetiredAuthEmail: async () => false,
  withAvailableEmail: async (_email: string, work: (tx: unknown) => unknown) =>
    work({ user: { create: mocks.createUser } }),
}))

vi.mock('next-auth', () => ({ getServerSession: mocks.session }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.findUniqueUser, create: mocks.createUser },
    mobileSession: { findUnique: mocks.findUniqueSession, create: mocks.createSession },
    passwordResetToken: { findUnique: mocks.findUniqueToken, create: mocks.createToken },
    $transaction: (run: (tx: unknown) => unknown) =>
      run({
        $queryRaw: async () => [],
        user: { findUnique: mocks.findUniqueUser },
        customerMfa: { upsert: async () => ({ version: 0, enabledAt: null }) },
      }),
  },
}))

vi.mock('@/lib/mfa/service', () => ({
  primaryLogin: async () => ({ ok: true }),
}))

import { POST as finalizeHandler } from './finalize/route'
import { POST as exchangeHandler } from './exchange/route'
import { createMobileOAuthTicket } from '@/lib/mobile-oauth'

const customer = {
  id: 'cust-123',
  email: 'googleuser@example.com',
  firstName: 'Google',
  lastName: 'User',
  role: 'CUSTOMER',
  isArchived: false,
  isSuperAdmin: false,
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.session.mockResolvedValue({
    user: { email: customer.email, name: 'Google User' },
  })
  mocks.findUniqueUser.mockResolvedValue(customer)
  mocks.createUser.mockResolvedValue(customer)
  mocks.findUniqueToken.mockResolvedValue(null)
  mocks.createToken.mockResolvedValue({})
  mocks.createSession.mockResolvedValue({})
})

describe('Mobile Google OAuth — Finalize Endpoint', () => {
  it('rejects unauthenticated requests with 401 when no NextAuth session is present', async () => {
    mocks.session.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/mobile/auth/google/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'login' }),
    })
    const res = await finalizeHandler(req)
    expect(res.status).toBe(401)
  })

  it('mode=login: returns 404 if user does not exist', async () => {
    mocks.findUniqueUser.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/mobile/auth/google/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'login' }),
    })
    const res = await finalizeHandler(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toContain('Account not found')
  })

  it('mode=login: returns ticket when user exists', async () => {
    const req = new NextRequest('http://localhost/api/mobile/auth/google/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'login' }),
    })
    const res = await finalizeHandler(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(typeof json.data.ticket).toBe('string')
  })

  it('mode=register: returns 409 if user already exists', async () => {
    const req = new NextRequest('http://localhost/api/mobile/auth/google/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'register' }),
    })
    const res = await finalizeHandler(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toContain('already exists')
  })

  it('mode=register: creates user and returns ticket if user does not exist', async () => {
    mocks.findUniqueUser.mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/mobile/auth/google/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'register' }),
    })
    const res = await finalizeHandler(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(typeof json.data.ticket).toBe('string')
    expect(mocks.createUser).toHaveBeenCalled()
  })
})

describe('Mobile Google OAuth — Exchange Endpoint', () => {
  it('rejects an invalid ticket with 400', async () => {
    const req = new NextRequest('http://localhost/api/mobile/auth/google/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: 'invalid.ticket.token' }),
    })
    const res = await exchangeHandler(req)
    expect(res.status).toBe(400)
  })

  it('exchanges a valid ticket for mobile session tokens', async () => {
    const ticket = createMobileOAuthTicket(customer.id, customer.email)
    const req = new NextRequest('http://localhost/api/mobile/auth/google/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
    })
    const res = await exchangeHandler(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.user.id).toBe(customer.id)
    expect(json.data.tokens).toHaveProperty('accessToken')
    expect(json.data.tokens).toHaveProperty('refreshToken')
  })

  it('rejects a replayed ticket that was already consumed', async () => {
    mocks.findUniqueToken.mockResolvedValue({ id: 'used-token' })
    const ticket = createMobileOAuthTicket(customer.id, customer.email)
    const req = new NextRequest('http://localhost/api/mobile/auth/google/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
    })
    const res = await exchangeHandler(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid or expired')
  })
})

