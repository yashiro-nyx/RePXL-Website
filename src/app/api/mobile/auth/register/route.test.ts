import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  class RegistrationError extends Error {
    constructor(message: string, public readonly status: number) {
      super(message)
    }
  }
  return {
    RegistrationError,
    register: vi.fn(),
  }
})

vi.mock('@/lib/customer-registration', () => ({
  CustomerRegistrationError: mocks.RegistrationError,
  registerMobileCustomer: mocks.register,
}))

import { POST } from './route'

const input = {
  firstName: 'Alex',
  lastName: 'Reyes',
  email: 'alex@example.com',
  password: 'correct-horse-battery-staple',
}

const user = {
  id: 'customer-id',
  email: input.email,
  firstName: input.firstName,
  lastName: input.lastName,
  role: 'CUSTOMER' as const,
  isSuperAdmin: false,
  createdAt: new Date(),
}

const tokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  accessExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/mobile/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-platform': 'expo' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.register.mockResolvedValue({ user, tokens })
})

describe('mobile customer registration', () => {
  it('rejects invalid registration data before creating an account or session', async () => {
    const response = await POST(request({ email: 'invalid' }))
    expect(response.status).toBe(422)
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it('creates the customer and returns a complete mobile session in one response', async () => {
    const response = await POST(request(input))
    expect(response.status).toBe(201)
    expect(mocks.register).toHaveBeenCalledWith(input, {
      deviceName: undefined,
      platform: 'expo',
    })
    expect(await response.json()).toEqual({
      success: true,
      data: {
        mfaRequired: false,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isSuperAdmin: false,
        },
        tokens,
      },
    })
  })

  it('returns a conflict without issuing a partial success for an existing email', async () => {
    mocks.register.mockRejectedValue(
      new mocks.RegistrationError('An account with this email already exists', 409)
    )
    const response = await POST(request(input))
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      success: false,
      error: 'An account with this email already exists',
    })
  })

  it('does not leak internal errors', async () => {
    mocks.register.mockRejectedValue(new Error('database connection details'))
    const response = await POST(request(input))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ success: false, error: 'Internal server error' })
  })
})
