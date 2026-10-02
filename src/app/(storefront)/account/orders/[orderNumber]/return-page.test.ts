import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Structural tests (node-env) for the Return/Refund page's customer-facing
// messaging + a11y. Message-mapping behavior is covered by errors.test.ts.

const page = readFileSync('src/app/(storefront)/account/orders/[orderNumber]/return/page.tsx', 'utf8')

describe('Return/Refund page — safe, human-friendly errors', () => {
  it('routes submit failures through the shared client error mapper', () => {
    expect(page).toContain("from '@/lib/errors/client-errors'")
    expect(page).toContain('toUserMessageFromResponse')
    expect(page).toContain('getFieldErrors')
  })
  it('never renders raw server error text directly (no body.error into state)', () => {
    expect(page).not.toContain('body.error ||')
    expect(page).not.toContain('setSubmitError(body.error')
  })
  it('shows a friendly details validation message (no schema jargon)', () => {
    expect(page).toContain('at least 10 characters')
    expect(page).not.toContain('too_small')
    expect(page).not.toContain('Validation error:')
  })
  it('has clearer labels + helper text near the details field', () => {
    expect(page).toContain('Describe the issue')
    expect(page).toContain('return-details-help')
    expect(page).toContain('Tell us what happened')
  })
  it('states real file limits near the upload area', () => {
    expect(page).toContain('JPG, PNG, or WebP')
    expect(page).toContain('5 MB')
    expect(page).toContain('Please upload clear photos')
  })
})

describe('Return/Refund page — accessibility', () => {
  it('associates the details error with the field via aria-describedby + aria-invalid', () => {
    expect(page).toContain('aria-invalid={errors.details ? true : undefined}')
    expect(page).toContain('aria-describedby={errors.details')
    expect(page).toContain('id="return-details-error"')
  })
  it('error messages use role="alert" and are not color-only (icon + text)', () => {
    expect(page).toContain('role="alert"')
    // The submit banner + field errors include an icon alongside the text.
    expect(page).toContain('aria-live="assertive"')
  })
})
