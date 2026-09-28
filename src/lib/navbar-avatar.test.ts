import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

// ─── Navbar profile picture wiring ───────────────────────────────────────────────
// Regression guard for the reported bug: uploading a new profile picture updated
// the DB + auth store, but the navbar avatar never changed because the navbar
// rendered ONLY initials and never read `avatarUrl`. These tests assert the
// navbar is wired to the same single source of truth (useAuthStore().avatarUrl)
// used by ProfilePanel and AccountShell, so a successful update reflects
// immediately without a refresh.

const navbar = readFileSync('src/components/layout/Navbar.tsx', 'utf8')

describe('Navbar avatar wiring — single source of truth', () => {
  it('reads avatarUrl from the shared auth store', () => {
    expect(navbar).toMatch(/const\s*\{[^}]*\bavatarUrl\b[^}]*\}\s*=\s*useAuthStore\(\)/)
  })

  it('renders the profile photo via next/image when an avatarUrl exists', () => {
    expect(navbar).toContain("import Image from 'next/image'")
    expect(navbar).toMatch(/avatarUrl\s*\?\s*\(\s*<Image/)
    expect(navbar).toContain('src={avatarUrl}')
  })

  it('falls back to initials when there is no avatarUrl (default avatar preserved)', () => {
    // The initials expression is still present as the fallback branch.
    expect(navbar).toMatch(/firstName\?\.\[0\][^\n]*lastName\?\.\[0\]/)
  })

  it('keeps the circular avatar shape and clips the image (rounded-full + overflow-hidden)', () => {
    // The profile button wraps the image in a rounded, clipped container.
    expect(navbar).toMatch(/overflow-hidden rounded-full/)
  })

  it('shows the avatar in the desktop button, the dropdown header, and the mobile drawer', () => {
    // Three distinct <Image src={avatarUrl}> usages (button + dropdown + mobile).
    const matches = navbar.match(/<Image\s+src=\{avatarUrl\}/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(3)
  })
})

describe('Avatar source-of-truth consistency across displays', () => {
  it.each([
    ['navbar', 'src/components/layout/Navbar.tsx'],
    ['account sidebar (AccountShell)', 'src/components/account/AccountShell.tsx'],
    ['profile management (ProfilePanel)', 'src/components/account/ProfilePanel.tsx'],
  ])('%s reads avatarUrl from useAuthStore', (_label, file) => {
    const src = readFileSync(file, 'utf8')
    expect(src).toContain('useAuthStore')
    expect(src).toContain('avatarUrl')
    expect(src).toContain('src={avatarUrl}')
  })

  it('ProfilePanel re-hydrates the shared store after a successful upload and removal', () => {
    const panel = readFileSync('src/components/account/ProfilePanel.tsx', 'utf8')
    // Upload then hydrate; delete then hydrate — so every display updates at once.
    expect(panel).toMatch(/fetch\('\/api\/upload\/avatar',\s*\{\s*method:\s*'POST'[\s\S]*?await hydrate\(\)/)
    expect(panel).toMatch(/method:\s*'DELETE'[\s\S]*?await hydrate\(\)/)
  })

  it('logging out clears avatarUrl so another user never sees the previous avatar', () => {
    const store = readFileSync('src/stores/authStore.ts', 'utf8')
    // LOGGED_OUT state nulls avatarUrl; userState maps it per authenticated user.
    expect(store).toMatch(/avatarUrl:\s*null/)
    expect(store).toContain('avatarUrl: user.avatarUrl ?? null')
  })
})

describe('Avatar upload API — new URL per upload (no stale-cache problem)', () => {
  const route = readFileSync('src/app/api/upload/avatar/route.ts', 'utf8')

  it('generates a unique public id per upload so replaced images get a fresh URL', () => {
    expect(route).toContain('generatePublicId')
  })

  it('only marks the avatar saved after the server confirms (persists then returns the URL)', () => {
    // The DB update happens before returning the new avatarUrl.
    expect(route).toMatch(/prisma\.user\.update[\s\S]*?avatarUrl:\s*result\.secure_url[\s\S]*?successResponse\(\{\s*avatarUrl/)
  })

  it('DELETE clears the stored avatarUrl', () => {
    expect(route).toMatch(/data:\s*\{\s*avatarUrl:\s*null\s*\}/)
  })
})
