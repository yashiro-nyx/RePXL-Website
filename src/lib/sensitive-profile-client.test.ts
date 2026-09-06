import { afterEach, expect, it, vi } from 'vitest'
import { authService } from './data/authService'
import { useAuthStore } from '@/stores/authStore'

afterEach(() => vi.unstubAllGlobals())
it('hydrates masked fields and password capability without retaining raw profile data', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: 'test',
              email: 'user@example.test',
              firstName: 'Test',
              lastName: 'User',
              role: 'CUSTOMER',
              isSuperAdmin: false,
              phone: '09171234567',
              dateOfBirth: '1990-06-15',
              maskedPhone: '*******4567',
              maskedDob: '**/**/1990',
              hasPassword: true,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
  )
  const user = await authService.me()
  expect(user).toMatchObject({
    maskedPhone: '*******4567',
    maskedDob: '**/**/1990',
    hasPassword: true,
  })
  expect(user).not.toHaveProperty('phone')
  expect(user).not.toHaveProperty('dateOfBirth')
  // Use a fresh response because fetch bodies are one-use.
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        data: user && { ...user, role: 'CUSTOMER' },
      }),
      { status: 200 }
    )
  )
  await useAuthStore.getState().hydrate()
  expect(useAuthStore.getState()).toMatchObject({
    maskedPhone: '*******4567',
    maskedDob: '**/**/1990',
    hasPassword: true,
  })
  expect(useAuthStore.getState()).not.toHaveProperty('userPhone')
  expect(useAuthStore.getState()).not.toHaveProperty('dateOfBirth')
})
