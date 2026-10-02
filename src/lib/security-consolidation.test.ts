import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { accountNavigation } from './account-navigation'

// Structural tests for consolidating password management under Security and
// making the Security overview view-only. Step-up/MFA behavior is covered by
// recent-auth*.test.ts and the MFA suites.

const overview = readFileSync('src/components/account/SecurityOverview.tsx', 'utf8')
const overviewPage = readFileSync('src/app/(storefront)/account/security/page.tsx', 'utf8')
const passwordPanel = readFileSync('src/components/account/PasswordPanel.tsx', 'utf8')

describe('Security consolidation — navigation', () => {
  it('has no standalone "Change Password" nav item', () => {
    expect(accountNavigation.some((i) => i.label === 'Change Password')).toBe(false)
    expect(accountNavigation.some((i) => i.href === '/account/security/password' && !i.group)).toBe(false)
    // No TOP-LEVEL password item — password is only a child of Security.
    const topLevel = accountNavigation.filter((i) => i.href === '/account/security/password')
    expect(topLevel).toHaveLength(0)
  })

  it('keeps password reachable as a Security child (no broken link)', () => {
    const security = accountNavigation.find((i) => i.href === '/account/security')
    expect(security?.children?.map((c) => c.href)).toContain('/account/security/password')
  })
})

describe('Security overview — view-only, real sections', () => {
  it('is not wrapped in SecurityGate (viewing never prompts)', () => {
    expect(overviewPage).not.toContain('SecurityGate')
    expect(overviewPage).toContain('SecurityOverview')
  })

  it('renders Password, Two-Factor, and (conditionally) Connected Account sections', () => {
    expect(overview).toContain('Password')
    expect(overview).toContain('Two-Factor Authentication')
    expect(overview).toContain('Connected Account')
    // Connected Account only appears when Google is actually linked.
    expect(overview).toContain('googleLinked &&')
    // Change/Set Password action links into the consolidated password sub-page.
    expect(overview).toContain('/account/security/password')
    expect(overview).toContain('/account/security/mfa')
  })

  it('does not invent tracked data (no fabricated last-changed/last-login)', () => {
    expect(overview).not.toContain('Last changed')
    expect(overview).not.toContain('Last Login')
    // The fabricated "Recent Activity" block was removed from PasswordPanel.
    expect(passwordPanel).not.toContain('Recent Activity')
    expect(passwordPanel).not.toContain("value: 'Today'")
  })
})

describe('Password panel — customer-friendly, Google-only aware', () => {
  it('shows Set Password for Google-only accounts, Change Password otherwise', () => {
    expect(passwordPanel).toContain('Set a RePXL Password')
    expect(passwordPanel).toContain('Change Password')
    expect(passwordPanel).toContain('/api/auth/set-password')
  })
  it('uses friendly, non-technical error messages', () => {
    expect(passwordPanel).toContain('The current password you entered is incorrect.')
    expect(passwordPanel).toContain("Your new passwords don't match.")
    expect(passwordPanel).not.toContain('ZodError')
  })
  it('blocks duplicate Set Password submissions while the request is pending', () => {
    expect(passwordPanel).toContain('if (saving) return')
    expect(passwordPanel).toContain('setSaving(true)')
    expect(passwordPanel).toContain('disabled={hasPassword === null || !allMet || saving}')
    expect(passwordPanel).toContain('loading={saving}')
    expect(passwordPanel).toContain('setSaving(false)')
  })
})
