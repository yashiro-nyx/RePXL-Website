import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Structural/contract tests for the floating chat widget. The project's Vitest
// environment is node-only (no DOM renderer), so — consistent with the existing
// UI tests in this repo — these assert the widget's wiring and behavior at the
// source level. Logic is covered separately in ai-concierge.test.ts.

const widget = readFileSync('src/components/chat/ChatWidget.tsx', 'utf8')
const gate = readFileSync('src/components/chat/ConditionalChatWidget.tsx', 'utf8')
const rootLayout = readFileSync('src/app/layout.tsx', 'utf8')

describe('ChatWidget — reuse of shared concierge logic', () => {
  it('uses the shared concierge module, not a duplicated brain or a backend call', () => {
    expect(widget).toContain("from '@/lib/ai-concierge'")
    expect(widget).toContain('generateAiResponse')
    // No network/backend chat infrastructure introduced.
    expect(widget).not.toMatch(/fetch\(|axios|\/api\/chat/)
  })

  it('maps assistant actions to real storefront routes via webActionHref', () => {
    expect(widget).toContain('webActionHref')
  })
})

describe('ChatWidget — honest AI (not human) identity', () => {
  it('labels itself an automated assistant and never claims a human agent is online', () => {
    expect(widget).toContain('Automated assistant')
    expect(widget).toMatch(/automated assistant \(not a human agent\)/i)
    expect(widget).not.toMatch(/agent (is )?online|human (agent )?online|online now/i)
  })
})

describe('ChatWidget — conversation behavior', () => {
  it('sends on Enter and inserts a newline on Shift+Enter', () => {
    expect(widget).toContain("e.key === 'Enter' && !e.shiftKey")
    expect(widget).toContain('e.preventDefault()')
  })

  it('prevents empty and duplicate submissions', () => {
    expect(widget).toContain('if (!text) return')
    expect(widget).toContain('if (pendingRef.current) return')
  })

  it('shows a typing indicator and auto-scrolls to new messages', () => {
    expect(widget).toContain('isTyping')
    expect(widget).toContain('scrollRef.current.scrollTop = scrollRef.current.scrollHeight')
  })

  it('has an error state with retry', () => {
    expect(widget).toContain('setError(')
    expect(widget).toContain('retry')
  })

  it('persists the conversation in sessionStorage (survives navigation + minimize)', () => {
    expect(widget).toContain('sessionStorage')
    expect(widget).toContain("STORAGE_KEY = 'repixl:chat'")
    // Persistence is session-scoped and non-sensitive (support Q&A only) — not localStorage.
    expect(widget).not.toContain('localStorage')
  })
})

describe('ChatWidget — accessibility', () => {
  it('launcher and dialog expose ARIA and the panel is not a focus-trapping modal', () => {
    expect(widget).toContain('aria-label={open ? \'Close chat\' : \'Open RePXL AI Concierge chat\'}')
    expect(widget).toContain('aria-haspopup="dialog"')
    expect(widget).toContain('role="dialog"')
    expect(widget).toContain('aria-modal="false"')
  })

  it('announces messages politely and supports keyboard close (Escape)', () => {
    expect(widget).toContain('aria-live="polite"')
    expect(widget).toContain("e.key === 'Escape'")
  })

  it('respects reduced motion and provides visible focus rings', () => {
    expect(widget).toContain('motion-reduce:')
    expect(widget).toContain('focus-visible:ring')
  })
})

describe('ChatWidget — responsive & safe placement', () => {
  it('is fixed bottom-right with viewport-bounded sizing and safe-area padding', () => {
    expect(widget).toContain('fixed bottom-4 right-4')
    expect(widget).toContain('calc(100vw-2rem)')
    expect(widget).toContain('calc(100vh-7rem)')
    expect(widget).toContain('env(safe-area-inset-bottom)')
  })
})

describe('Chat widget mounting & route gating', () => {
  it('is mounted once in the root layout', () => {
    expect(rootLayout).toContain('ConditionalChatWidget')
    expect(rootLayout.match(/<ConditionalChatWidget \/>/g)?.length).toBe(1)
  })

  it('is hidden on admin, auth, and payment-result routes', () => {
    for (const p of ['/admin', '/login', '/register', '/forgot-password', '/reset-password', '/checkout/success', '/checkout/processing']) {
      expect(gate).toContain(`'${p}'`)
    }
    expect(gate).toContain('usePathname')
  })

  it('remains available on the rest of the storefront (renders ChatWidget otherwise)', () => {
    expect(gate).toContain('return <ChatWidget />')
  })
})
