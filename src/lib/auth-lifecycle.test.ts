import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import { authService, type AuthUser } from './data/authService'

const user: AuthUser = { email: 'customer@example.test', firstName: 'Test', lastName: 'Customer', role: 'customer', isSuperAdmin: false, hasPassword: true, maskedPhone: '—', maskedDob: '—' }
const store = () => useAuthStore.getState()
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
let storage: Map<string, string>
beforeEach(() => {
  storage = new Map()
  vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, removeItem: (k: string) => storage.delete(k), setItem: (k: string, v: string) => storage.set(k, v), length: 0 })
  store().acceptSession(user)
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('customer auth hydration', () => {
  it.each(['network', '500'])('preserves an authenticated display on %s errors, then retries', async (failure) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      if (failure === 'network') throw new TypeError('Offline')
      return Response.json({success: false}, {status: 500})
    }))
    await store().hydrate()
    expect(store()).toMatchObject({ isLoggedIn: true, userEmail: user.email, authStatus: 'error' })
    vi.spyOn(authService, 'me').mockResolvedValue(user)
    await store().hydrate()
    expect(store()).toMatchObject({ isLoggedIn: true, authStatus: 'authenticated', authError: null })
  })
  it('does not authenticate an initial visitor on a network failure', async () => {
    useAuthStore.setState({ isLoggedIn: false, authStatus: 'idle', userEmail: '' })
    vi.spyOn(authService, 'me').mockRejectedValue(new Error('Offline'))
    await store().hydrate()
    expect(store()).toMatchObject({ isLoggedIn: false, authStatus: 'error' })
  })
  it('treats an explicit 401 as unauthenticated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({success: false}, {status: 401})))
    await store().hydrate()
    expect(store()).toMatchObject({ isLoggedIn: false, authStatus: 'unauthenticated', userEmail: '' })
  })
  it('requests the customer session even if an admin cookie exists', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({success: false}, {status: 401}))
    vi.stubGlobal('fetch', fetcher)
    await store().hydrate()
    expect(fetcher).toHaveBeenCalledWith('/api/auth/me?scope=customer', expect.objectContaining({credentials: 'include'}))
  })
  it('ignores a stale unauthorized hydration started during password login', async () => {
    const login = deferred<{ok: true; user: AuthUser}>()
    const hydration = deferred<AuthUser | null>()
    vi.spyOn(authService, 'login').mockReturnValue(login.promise)
    vi.spyOn(authService, 'me').mockReturnValue(hydration.promise)
    const loggingIn = store().login(user.email, 'test-password')
    const loading = store().hydrate()
    login.resolve({ok: true, user}); await loggingIn
    hydration.resolve(null); await loading
    expect(store()).toMatchObject({isLoggedIn: true, authStatus: 'authenticated'})
  })
  it('does not let an older hydration overwrite a newer server result', async () => {
    const old = deferred<AuthUser | null>()
    vi.spyOn(authService, 'me').mockReturnValueOnce(old.promise).mockResolvedValueOnce(null)
    const loading = store().hydrate()
    await store().hydrate()
    old.resolve(user); await loading
    expect(store().isLoggedIn).toBe(false)
  })
  it('clears the stale OAuth logout flag after successful credential login', async () => {
    storage.set('repixl-oauth-logged-out', '1')
    vi.spyOn(authService, 'login').mockResolvedValue({ok: true, user})
    expect(await store().login(user.email, 'test-password')).toBe(true)
    expect(storage.has('repixl-oauth-logged-out')).toBe(false)
  })
  it('intentional Google completion invalidates old hydration and clears the flag', async () => {
    storage.set('repixl-oauth-logged-out', '1')
    const old = deferred<AuthUser | null>()
    vi.spyOn(authService, 'me').mockReturnValue(old.promise)
    const loading = store().hydrate()
    store().acceptSession(user)
    old.resolve(null); await loading
    expect(store().isLoggedIn).toBe(true)
    expect(storage.has('repixl-oauth-logged-out')).toBe(false)
  })
  it('refreshes after MFA without accepting an older unauthorized response', async () => {
    const old = deferred<AuthUser | null>()
    vi.spyOn(authService, 'me').mockReturnValueOnce(old.promise).mockResolvedValueOnce(user)
    const loading = store().hydrate()
    await store().refreshSession()
    old.resolve(null); await loading
    expect(store().isLoggedIn).toBe(true)
  })
  it('logout prevents in-flight hydration from restoring the user', async () => {
    const old = deferred<AuthUser | null>()
    vi.spyOn(authService, 'me').mockReturnValue(old.promise)
    vi.spyOn(authService, 'logout').mockResolvedValue()
    const loading = store().hydrate()
    await store().logout()
    old.resolve(user); await loading
    expect(store().isLoggedIn).toBe(false)
    expect(storage.get('repixl-oauth-logged-out')).toBe('1')
  })
})
