import { describe, expect } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { BannerPlacement, PageStatus } from '@prisma/client'
import {
  isValidSlug,
  validateStaticPage,
  isSlugUnique,
  isPageVisibleTo,
  sortByUpdatedDesc,
  validateBanner,
  validateSchedule,
  isBannerVisible,
  validateHomepageBlock,
  BANNER_TITLE_MAX,
  PAGE_TITLE_MAX,
  PAGE_BODY_MAX,
  SLUG_MAX,
  DISPLAY_ORDER_MIN,
  DISPLAY_ORDER_MAX,
} from '@/lib/cms'

const NUM_RUNS = 200

// ─── Arbitraries ────────────────────────────────────────────────────────────────

const validSlugArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
    minLength: 1,
    maxLength: SLUG_MAX,
  })

const dateArb = fc.date({
  min: new Date('2000-01-01T00:00:00.000Z'),
  max: new Date('2100-01-01T00:00:00.000Z'),
  noInvalidDate: true,
})

// ─── Property 14: Static page and banner lists are ordered ──────────────────────

describe('Property 14: Static page and banner lists are ordered', () => {
  // Feature: admin-client-management-suite, Property 14: Static page and banner
  // lists are ordered — For any set of static pages, the rendered list SHALL be
  // ordered by last-updated timestamp in non-increasing order.
  // Validates: Requirements 5.1
  test.prop([fc.array(fc.record({ id: fc.string(), updatedAt: dateArb }), { maxLength: 40 })], {
    numRuns: NUM_RUNS,
  })('orders items by updatedAt descending', (items) => {
    const sorted = sortByUpdatedDesc(items)
    // Same multiset of elements (no loss / duplication).
    expect(sorted.length).toBe(items.length)
    // Non-increasing by updatedAt.
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].updatedAt.getTime()).toBeGreaterThanOrEqual(
        sorted[i].updatedAt.getTime()
      )
    }
  })
})

// ─── Property 15: Static page validation enforces field rules ───────────────────

describe('Property 15: Static page validation enforces field rules', () => {
  // Feature: admin-client-management-suite, Property 15: Static page validation
  // enforces field rules — accept only when title 1–200, slug 1–100 of
  // lowercase/digits/hyphens, body 1–100000; otherwise reject and report each
  // invalid field.
  // Validates: Requirements 5.3, 5.4
  test.prop(
    [
      fc.record({
        title: fc.string({ maxLength: 260 }),
        slug: fc.string({ maxLength: 130 }),
        body: fc.string({ maxLength: 120 }),
      }),
    ],
    { numRuns: NUM_RUNS }
  )('accepts iff all fields in range, reporting each invalid field', (input) => {
    const result = validateStaticPage(input)

    const titleOk = input.title.length >= 1 && input.title.length <= PAGE_TITLE_MAX
    const slugOk = isValidSlug(input.slug)
    const bodyOk = input.body.length >= 1 && input.body.length <= PAGE_BODY_MAX

    expect(result.valid).toBe(titleOk && slugOk && bodyOk)
    expect('title' in result.errors).toBe(!titleOk)
    expect('slug' in result.errors).toBe(!slugOk)
    expect('body' in result.errors).toBe(!bodyOk)
  })

  test.prop([fc.string({ minLength: 1, maxLength: PAGE_TITLE_MAX }), validSlugArb], {
    numRuns: NUM_RUNS,
  })('accepts a fully valid page', (title, slug) => {
    const result = validateStaticPage({ title, slug, body: 'x' })
    expect(result.valid).toBe(true)
    expect(Object.keys(result.errors)).toHaveLength(0)
  })
})

// ─── Property 16: Static page slugs are unique ──────────────────────────────────

describe('Property 16: Static page slugs are unique', () => {
  // Feature: admin-client-management-suite, Property 16: Static page slugs are
  // unique — creation SHALL be rejected iff the candidate already exists in the
  // set of existing slugs.
  // Validates: Requirements 5.5
  test.prop([fc.array(validSlugArb, { maxLength: 30 }), validSlugArb], {
    numRuns: NUM_RUNS,
  })('unique iff not already present', (existing, candidate) => {
    expect(isSlugUnique(candidate, existing)).toBe(!existing.includes(candidate))
  })

  test.prop([fc.array(validSlugArb, { minLength: 1, maxLength: 30 })], {
    numRuns: NUM_RUNS,
  })('a slug already in the set is never unique', (existing) => {
    const candidate = existing[0]
    expect(isSlugUnique(candidate, existing)).toBe(false)
  })
})

// ─── Property 17: Draft pages are hidden from non-admins ────────────────────────

describe('Property 17: Draft pages are hidden from non-admins', () => {
  // Feature: admin-client-management-suite, Property 17: Draft pages are hidden
  // from non-admins — a non-admin request SHALL receive not-found iff the page
  // status is DRAFT.
  // Validates: Requirements 5.7
  test.prop(
    [fc.constantFrom(PageStatus.DRAFT, PageStatus.PUBLISHED), fc.boolean()],
    { numRuns: NUM_RUNS }
  )('draft hidden from non-admins, published visible to all', (status, isAdmin) => {
    const visible = isPageVisibleTo(status, isAdmin)
    if (status === PageStatus.PUBLISHED) {
      expect(visible).toBe(true)
    } else {
      // DRAFT: visible only to admins → hidden (not-found) iff non-admin.
      expect(visible).toBe(isAdmin)
      if (!isAdmin) expect(visible).toBe(false)
    }
  })
})

// ─── Property 18: Banner field validation ───────────────────────────────────────

describe('Property 18: Banner field validation', () => {
  // Feature: admin-client-management-suite, Property 18: Banner field validation
  // — accept only when title 1–120, image ref present, placement in the defined
  // set, and link target a valid URL; otherwise reject and report each invalid
  // field.
  // Validates: Requirements 6.2, 6.3
  const placementArb = fc.oneof(
    fc.constantFrom<string>(...Object.values(BannerPlacement)),
    fc.string({ maxLength: 20 }) // may or may not be a valid placement
  )
  const urlArb = fc.oneof(
    fc.webUrl(),
    fc.string({ maxLength: 30 }) // may or may not be a valid URL
  )

  test.prop(
    [
      fc.record({
        title: fc.string({ maxLength: 140 }),
        imageRef: fc.string({ maxLength: 40 }),
        placement: placementArb,
        linkTarget: urlArb,
      }),
    ],
    { numRuns: NUM_RUNS }
  )('accepts iff every field valid, reporting each invalid field', (input) => {
    const result = validateBanner(input)

    const titleOk = input.title.length >= 1 && input.title.length <= BANNER_TITLE_MAX
    const imageOk = input.imageRef.trim().length > 0
    const placementOk = (Object.values(BannerPlacement) as string[]).includes(input.placement)
    let urlOk = false
    try {
      const u = new URL(input.linkTarget)
      urlOk = u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      urlOk = false
    }

    expect(result.valid).toBe(titleOk && imageOk && placementOk && urlOk)
    expect('title' in result.errors).toBe(!titleOk)
    expect('imageRef' in result.errors).toBe(!imageOk)
    expect('placement' in result.errors).toBe(!placementOk)
    expect('linkTarget' in result.errors).toBe(!urlOk)
  })
})

// ─── Property 19: Banner schedule requires start before end ─────────────────────

describe('Property 19: Banner schedule requires start before end', () => {
  // Feature: admin-client-management-suite, Property 19: Banner schedule requires
  // start before end — validateSchedule accepts iff the start date is strictly
  // earlier than the end date.
  // Validates: Requirements 6.4
  test.prop([dateArb, dateArb], { numRuns: NUM_RUNS })(
    'valid iff start strictly before end',
    (start, end) => {
      expect(validateSchedule(start, end)).toBe(start.getTime() < end.getTime())
    }
  )
})

// ─── Property 20: Banner visibility respects active state and schedule ──────────

describe('Property 20: Banner visibility respects active state and schedule', () => {
  // Feature: admin-client-management-suite, Property 20: Banner visibility
  // respects active state and schedule — visible iff active and (when a schedule
  // is set) now is within [start, end] inclusive; a disabled banner is never
  // visible.
  // Validates: Requirements 6.5, 6.6
  const maybeDate = fc.option(dateArb, { nil: null })

  test.prop([fc.boolean(), maybeDate, maybeDate, dateArb], { numRuns: NUM_RUNS })(
    'active + within schedule ⇒ visible; disabled ⇒ never visible',
    (isActive, startDate, endDate, now) => {
      const banner = { isActive, startDate, endDate }
      const visible = isBannerVisible(banner, now)

      if (!isActive) {
        expect(visible).toBe(false)
        return
      }

      const afterStart = startDate === null || now.getTime() >= startDate.getTime()
      const beforeEnd = endDate === null || now.getTime() <= endDate.getTime()
      expect(visible).toBe(afterStart && beforeEnd)
    }
  )

  test.prop([maybeDate, maybeDate, dateArb], { numRuns: NUM_RUNS })(
    'a disabled banner is never visible regardless of schedule',
    (startDate, endDate, now) => {
      expect(isBannerVisible({ isActive: false, startDate, endDate }, now)).toBe(false)
    }
  )
})

// ─── Property 21: Homepage block validation ─────────────────────────────────────

describe('Property 21: Homepage block validation', () => {
  // Feature: admin-client-management-suite, Property 21: Homepage block
  // validation — accept only when content is non-empty and display order is an
  // integer 1–999; otherwise reject and report each invalid field.
  // Validates: Requirements 6.7, 6.8
  const contentArb = fc.oneof(
    fc.constant<unknown>(null),
    fc.constant<unknown>(''),
    fc.constant<unknown>('   '),
    fc.string({ minLength: 1, maxLength: 40 }),
    fc.record({ heading: fc.string() }),
    fc.constant<unknown>({}),
    fc.array(fc.string()),
  )
  const orderArb = fc.oneof(
    fc.integer({ min: -50, max: 1100 }),
    fc.double({ min: 0, max: 1000, noNaN: true }), // may be non-integer
  )

  test.prop([fc.record({ content: contentArb, displayOrder: orderArb })], {
    numRuns: NUM_RUNS,
  })('accepts iff content non-empty and order integer in [1,999]', (input) => {
    const result = validateHomepageBlock(input)

    const c = input.content
    let contentOk: boolean
    if (c === null || c === undefined) contentOk = false
    else if (typeof c === 'string') contentOk = c.trim().length > 0
    else if (Array.isArray(c)) contentOk = c.length > 0
    else if (typeof c === 'object') contentOk = Object.keys(c as object).length > 0
    else contentOk = true

    const orderOk =
      Number.isInteger(input.displayOrder) &&
      input.displayOrder >= DISPLAY_ORDER_MIN &&
      input.displayOrder <= DISPLAY_ORDER_MAX

    expect(result.valid).toBe(contentOk && orderOk)
    expect('content' in result.errors).toBe(!contentOk)
    expect('displayOrder' in result.errors).toBe(!orderOk)
  })
})
