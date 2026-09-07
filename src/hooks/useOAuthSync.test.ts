import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({
  pathname: '/', oauth: null as string | null, preference: null as string | null,
  authStatus: 'unauthenticated', isLoggedIn: false,
  loginWithOAuth: vi.fn().mockResolvedValue(undefined), signOut: vi.fn(),
}))
vi.mock('react', () => ({ useEffect: (effect: () => void) => effect(), useRef: (value: unknown) => ({ current: value }) }))
vi.mock('next-auth/react', () => ({ useSession: () => ({status: 'authenticated', data: {user: {email: 'google@example.test', name: 'Google Test'}}}), signOut: state.signOut }))
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname, useSearchParams: () => ({get: () => state.oauth}) }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (selector: (s: unknown) => unknown) => selector({...state, userEmail: 'credential@example.test'}) }))
import { useOAuthSync } from './useOAuthSync'
beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, {pathname: '/', oauth: null, preference: null, authStatus: 'unauthenticated', isLoggedIn: false})
  vi.stubGlobal('localStorage', {getItem: () => state.preference})
})
describe('OAuth and credential session separation', () => {
  it.each(['idle', 'loading', 'error', 'authenticated'])('does not bridge while customer state is %s', (authStatus) => {
    state.authStatus = authStatus
    useOAuthSync()
    expect(state.loginWithOAuth).not.toHaveBeenCalled()
  })
  it('does not replace a credential session with an old Google identity', () => {
    state.isLoggedIn = true
    useOAuthSync()
    expect(state.loginWithOAuth).not.toHaveBeenCalled()
  })
  it('intentional logout blocks automatic sync without triggering another signOut', () => {
    state.preference = '1'
    useOAuthSync()
    expect(state.loginWithOAuth).not.toHaveBeenCalled()
    expect(state.signOut).not.toHaveBeenCalled()
  })
  it.each(['login','register'])('leaves an intentional %s callback to its page despite a stale flag', (mode) => {
    state.pathname = '/'+mode; state.oauth = mode; state.preference = '1'
    useOAuthSync()
    expect(state.signOut).not.toHaveBeenCalled()
    expect(state.loginWithOAuth).not.toHaveBeenCalled()
  })
  it('bridges only after the customer session was explicitly found unauthenticated', () => {
    useOAuthSync()
    expect(state.loginWithOAuth).toHaveBeenCalledWith('google@example.test','Google','Test')
  })
})
