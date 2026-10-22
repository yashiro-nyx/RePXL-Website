import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const contactPage = readFileSync('src/app/(storefront)/contact/page.tsx', 'utf8')
const contactRoute = readFileSync('src/app/api/contact/route.ts', 'utf8')

describe('Contact page permanent redesigned form', () => {
  it('does not request or render Contact CMS content that can replace the form', () => {
    expect(contactPage).not.toContain("fetch('/api/pages/contact')")
    expect(contactPage).not.toContain('setCustomPage')
    expect(contactPage).not.toContain('if (customPage)')
    expect(contactPage).not.toContain('<CmsPageLayout')
    expect(contactPage).not.toContain('DEFAULT_CONTACT_BODY')
  })

  it('keeps every page hook unconditional before the redesigned form render', () => {
    const formRender = contactPage.indexOf('<motion.form')
    const pageHookCalls = [
      'useReducedMotion()',
      'useState<ContactFormData>',
      'useState<Partial<ContactFormData>>',
      "useState<'idle' | 'loading' | 'success' | 'error'>",
      "useState('')",
      'useToastStore((state) => state.addToast)',
    ]

    expect(formRender).toBeGreaterThan(-1)
    for (const hookCall of pageHookCalls) {
      const hookIndex = contactPage.indexOf(hookCall)
      expect(hookIndex, `${hookCall} should exist`).toBeGreaterThan(-1)
      expect(hookIndex, `${hookCall} must run before rendering the form`).toBeLessThan(formRender)
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

  it('keeps loading, error, and subject-shortcut updates inside the form flow', () => {
    expect(contactPage).toContain("status === 'success' ?")
    expect(contactPage).toContain("disabled={status === 'loading'}")
    expect(contactPage).toContain("status === 'loading' ?")
    expect(contactPage).toContain('{apiError && (')
    expect(contactPage).toContain('onClick={() => pickSubject(option)}')
    expect(contactPage).toContain('setFormData((prev) => ({ ...prev, subject }))')
    expect(contactPage).toContain("fetch('/api/contact'")
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
