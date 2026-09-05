import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  customerCookie: vi.fn(),
  adminCookie: vi.fn(),
  compare: vi.fn(),
}))

vi.mock('next-auth', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: mocks.findUnique, create: mocks.create } },
}))
vi.mock('@/lib/auth-helpers', () => ({
  setSessionCookie: mocks.customerCookie,
  setAdminSessionCookie: mocks.adminCookie,
}))
vi.mock('bcryptjs', () => ({ default: { compare: mocks.compare } }))

import { POST as legacy } from './route'
import { POST as googleLogin } from './login/route'
import { POST as googleRegister } from './register/route'
import { POST as passwordLogin } from '../login/route'
import { authOptions } from '@/lib/next-auth-options'

const customer = {
  id: 'customer-id', email: 'customer@example.com', firstName: 'Camera',
  lastName: 'Collector', phone: '', password: 'stored-hash', role: 'CUSTOMER',
  isArchived: false, isSuperAdmin: false,
}

function request(email = customer.email) {
  return new NextRequest('http://localhost/api/auth/oauth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, firstName: 'Camera', lastName: 'Collector', password: 'valid-password' }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.session.mockResolvedValue({ user: { email: customer.email, provider: 'google' } })
  mocks.findUnique.mockResolvedValue(customer)
  mocks.create.mockResolvedValue(customer)
  mocks.compare.mockResolvedValue(true)
})

describe.each([
  ['legacy refresh', legacy], ['Google login', googleLogin], ['Google registration', googleRegister],
] as const)('%s identity verification', (_name, handler) => {
  it.each([null, { user: {} }])('rejects an unverified submitted email before database access (%j)', async (session) => {
    mocks.session.mockResolvedValue(session)
    expect((await handler(request())).status).toBe(401)
    expect(mocks.session).toHaveBeenCalledWith(authOptions)
    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.customerCookie).not.toHaveBeenCalled()
    expect(mocks.adminCookie).not.toHaveBeenCalled()
  })

  it('rejects a claimed email that differs from the authenticated identity', async () => {
    expect((await handler(request('victim@example.com'))).status).toBe(403)
    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.customerCookie).not.toHaveBeenCalled()
  })
})

describe.each([['legacy refresh', legacy], ['Google login', googleLogin]] as const)('%s customer sessions', (_name, handler) => {
  it('restores an active customer session using the verified email', async () => {
    const response = await handler(request('CUSTOMER@example.com'))
    expect(response.status).toBe(200)
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { email: customer.email } })
    expect(mocks.customerCookie).toHaveBeenCalledTimes(1)
    expect(mocks.customerCookie).toHaveBeenCalledWith(customer.id)
    expect(mocks.adminCookie).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect((await response.json()).data).not.toHaveProperty('password')
  })

  it.each([
    { ...customer, isArchived: true },
    { ...customer, role: 'ADMIN', isSuperAdmin: true },
  ])('rejects archived and admin accounts', async (user) => {
    mocks.findUnique.mockResolvedValue(user)
    expect((await handler(request())).status).toBe(403)
    expect(mocks.customerCookie).not.toHaveBeenCalled()
    expect(mocks.adminCookie).not.toHaveBeenCalled()
  })

  it('does not register a missing account through login or refresh', async () => {
    mocks.findUnique.mockResolvedValue(null)
    expect((await handler(request())).status).toBe(404)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.customerCookie).not.toHaveBeenCalled()
  })
})

it('preserves verified Google registration through the registration endpoint', async () => {
  mocks.findUnique.mockResolvedValue(null)
  expect((await googleRegister(request())).status).toBe(200)
  expect(mocks.create).toHaveBeenCalledWith({ data: {
    email: customer.email, firstName: 'Camera', lastName: 'Collector', password: '', role: 'CUSTOMER',
  } })
  expect(mocks.customerCookie).toHaveBeenCalledWith(customer.id)
  expect(mocks.adminCookie).not.toHaveBeenCalled()
})

describe('password login remains independent of Google sessions', () => {
  it.each(['CUSTOMER', 'ADMIN'])('preserves %s password login and cookie selection', async (role) => {
    mocks.session.mockResolvedValue(null)
    mocks.findUnique.mockResolvedValue({ ...customer, role })
    expect((await passwordLogin(request())).status).toBe(200)
    expect(mocks.compare).toHaveBeenCalledWith('valid-password', customer.password)
    expect(mocks.customerCookie).toHaveBeenCalledWith(customer.id)
    expect(mocks.adminCookie).toHaveBeenCalledTimes(role === 'ADMIN' ? 1 : 0)
    expect(mocks.session).not.toHaveBeenCalled()
  })

  it('still rejects incorrect passwords without issuing cookies', async () => {
    mocks.compare.mockResolvedValue(false)
    expect((await passwordLogin(request())).status).toBe(401)
    expect(mocks.customerCookie).not.toHaveBeenCalled()
    expect(mocks.adminCookie).not.toHaveBeenCalled()
  })
})
