import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const contactPage = readFileSync('src/app/(storefront)/contact/page.tsx', 'utf8')
const contactRoute = readFileSync('src/app/api/contact/route.ts', 'utf8')

describe('Contact page hook-order regression', () => {
  it('declares every ContactPage hook before the custom CMS early return', () => {
    const customPageReturn = contactPage.indexOf('if (customPage)')
    const pageHookCalls = [
      'useReducedMotion()',
      'useState<{',
      'useEffect(() =>',
      'useState<ContactFormData>',
      'useState<Partial<ContactFormData>>',
      "useState<'idle' | 'loading' | 'success' | 'error'>",
      "useState('')",
      'useToastStore((state) => state.addToast)',
    ]

    expect(customPageReturn).toBeGreaterThan(-1)
    for (const hookCall of pageHookCalls) {
      const hookIndex = contactPage.indexOf(hookCall)
      expect(hookIndex, `${hookCall} should exist`).toBeGreaterThan(-1)
      expect(hookIndex, `${hookCall} must run before the CMS return`).toBeLessThan(customPageReturn)
    }
  })

  it('preserves the default form, validation, feedback, and support address', () => {
    for (const field of ['name', 'email', 'subject', 'message']) {
      expect(contactPage).toContain(`name="${field}"`)
    }
    for (const message of [
      'Name is required',
      'Email is required',
      'Please enter a valid email address',
      'Please select a subject',
      'Message is required',
      'Message Sent',
      'Unable to send your message. Please try again.',
    ]) {
      expect(contactPage).toContain(message)
    }
    expect(contactPage).toContain("value: 'repxl.support@gmail.com'")
    expect(contactPage).toContain("href: 'mailto:repxl.support@gmail.com'")
  })

  it('preserves server-side validation and customer-safe submission responses', () => {
    for (const message of [
      'Name is required.',
      'Valid email address is required.',
      'Subject is required.',
      'Message must be at least 10 characters.',
      'Message sent successfully.',
      'Unable to send your message. Please try again.',
    ]) {
      expect(contactRoute).toContain(message)
    }
    expect(contactRoute).not.toContain('message: err.message')
  })
})
