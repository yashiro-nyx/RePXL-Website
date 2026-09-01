import { BannerPlacement, PageStatus } from '@prisma/client'

// ─── CMS Logic Library ────────────────────────────────────────────────────────
//
// Pure logic for the CMS subsystem (static pages, banners, and homepage content
// blocks). Every function here is side-effect free so it can be property-tested
// in isolation from Prisma / I/O. See design.md "Components and Interfaces" §3.

/** Result of a field-level validation. `errors` maps field name → message. */
export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

// ─── Static Pages ─────────────────────────────────────────────────────────────

export const SLUG_MIN = 1
export const SLUG_MAX = 100
export const PAGE_TITLE_MIN = 1
export const PAGE_TITLE_MAX = 200
export const PAGE_BODY_MIN = 1
export const PAGE_BODY_MAX = 100_000

/**
 * Req 5.4: a slug is valid when it is 1–100 characters consisting only of
 * lowercase letters, digits, and hyphens.
 */
export function isValidSlug(slug: string): boolean {
  if (typeof slug !== 'string') return false
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) return false
  return /^[a-z0-9-]+$/.test(slug)
}

export interface StaticPageInput {
  title: string
  slug: string
  body: string
}

/**
 * Req 5.3 / 5.4: validate a static page. Accepts only when the title is 1–200,
 * the slug is a valid 1–100 slug, and the body is 1–100,000 characters. Reports
 * every invalid field.
 */
export function validateStaticPage(input: StaticPageInput): ValidationResult {
  const errors: Record<string, string> = {}

  const title = input.title ?? ''
  if (title.length < PAGE_TITLE_MIN || title.length > PAGE_TITLE_MAX) {
    errors.title = `Title must be ${PAGE_TITLE_MIN}–${PAGE_TITLE_MAX} characters`
  }

  const slug = input.slug ?? ''
  if (!isValidSlug(slug)) {
    errors.slug =
      `Slug must be ${SLUG_MIN}–${SLUG_MAX} characters of lowercase letters, digits, and hyphens`
  }

  const body = input.body ?? ''
  if (body.length < PAGE_BODY_MIN || body.length > PAGE_BODY_MAX) {
    errors.body = `Body must be ${PAGE_BODY_MIN}–${PAGE_BODY_MAX} characters`
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Req 5.5: a candidate slug is unique when it does not already exist in the set
 * of existing slugs.
 */
export function isSlugUnique(candidate: string, existingSlugs: readonly string[]): boolean {
  return !existingSlugs.includes(candidate)
}

/**
 * Req 5.7: a page is visible to a viewer when it is published, or when it is a
 * draft and the viewer is an admin. Draft pages are hidden from non-admins.
 */
export function isPageVisibleTo(status: PageStatus, isAdmin: boolean): boolean {
  if (status === PageStatus.PUBLISHED) return true
  return isAdmin
}

// ─── Ordering ─────────────────────────────────────────────────────────────────

/**
 * Req 5.1: return a copy of `items` ordered by `updatedAt` descending
 * (non-increasing). The input array is not mutated.
 */
export function sortByUpdatedDesc<T extends { updatedAt: Date }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

// ─── Banners ──────────────────────────────────────────────────────────────────

export const BANNER_TITLE_MIN = 1
export const BANNER_TITLE_MAX = 120

/** True when `value` is one of the defined BannerPlacement enum values. */
export function isValidPlacement(value: string): value is BannerPlacement {
  return (Object.values(BannerPlacement) as string[]).includes(value)
}

/** True when `target` parses as an absolute http(s) URL (Req 6.2/6.3). */
export function isValidUrl(target: string): boolean {
  if (typeof target !== 'string' || target.length === 0) return false
  try {
    const url = new URL(target)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export interface BannerInput {
  title: string
  imageRef: string
  placement: string
  linkTarget: string
}

/**
 * Req 6.2 / 6.3: validate a banner. Accepts only when the title is 1–120, the
 * image reference is present, the placement is in the defined set, and the link
 * target is a valid URL. Reports every invalid field.
 */
export function validateBanner(input: BannerInput): ValidationResult {
  const errors: Record<string, string> = {}

  const title = input.title ?? ''
  if (title.length < BANNER_TITLE_MIN || title.length > BANNER_TITLE_MAX) {
    errors.title = `Title must be ${BANNER_TITLE_MIN}–${BANNER_TITLE_MAX} characters`
  }

  const imageRef = input.imageRef ?? ''
  if (imageRef.trim().length === 0) {
    errors.imageRef = 'An image reference is required'
  }

  if (!isValidPlacement(input.placement)) {
    errors.placement = 'Placement must be a defined banner placement'
  }

  if (!isValidUrl(input.linkTarget)) {
    errors.linkTarget = 'Link target must be a valid URL'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Req 6.4: a schedule is valid when the start date is strictly earlier than the
 * end date. A schedule with either bound absent imposes no ordering constraint
 * and is considered valid.
 */
export function validateSchedule(start: Date | null, end: Date | null): boolean {
  if (start === null || end === null) return true
  return start.getTime() < end.getTime()
}

export interface BannerVisibility {
  isActive: boolean
  startDate: Date | null
  endDate: Date | null
}

/**
 * Req 6.5 / 6.6: a banner is visible when it is active and, where a schedule is
 * set, `now` is on or after the start date and on or before the end date
 * (inclusive). A disabled banner is never visible regardless of schedule.
 */
export function isBannerVisible(banner: BannerVisibility, now: Date): boolean {
  if (!banner.isActive) return false
  const t = now.getTime()
  if (banner.startDate !== null && t < banner.startDate.getTime()) return false
  if (banner.endDate !== null && t > banner.endDate.getTime()) return false
  return true
}

// ─── Homepage Content Blocks ────────────────────────────────────────────────────

export const DISPLAY_ORDER_MIN = 1
export const DISPLAY_ORDER_MAX = 999

/** True when the block content is present and non-empty. */
export function isContentNonEmpty(content: unknown): boolean {
  if (content === null || content === undefined) return false
  if (typeof content === 'string') return content.trim().length > 0
  if (Array.isArray(content)) return content.length > 0
  if (typeof content === 'object') return Object.keys(content as object).length > 0
  return true
}

export interface HomepageBlockInput {
  content: unknown
  displayOrder: number
}

/**
 * Req 6.7 / 6.8: validate a homepage content block. Accepts only when the
 * content is non-empty and the display order is an integer from 1 to 999.
 * Reports every invalid field.
 */
export function validateHomepageBlock(input: HomepageBlockInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!isContentNonEmpty(input.content)) {
    errors.content = 'Content must not be empty'
  }

  const order = input.displayOrder
  if (
    !Number.isInteger(order) ||
    order < DISPLAY_ORDER_MIN ||
    order > DISPLAY_ORDER_MAX
  ) {
    errors.displayOrder = `Display order must be an integer from ${DISPLAY_ORDER_MIN} to ${DISPLAY_ORDER_MAX}`
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
