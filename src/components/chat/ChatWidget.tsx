'use client'

/**
 * RePXL floating AI Concierge chat widget (storefront only).
 *
 * Reuses the shared, local, rule-based concierge logic (`src/lib/ai-concierge.ts`,
 * a faithful port of the mobile Support screen's brain) so the website and app
 * answer identically. This is an AI assistant — NOT a human live-chat — so the
 * UI never implies a live human presence; when a question needs a person it
 * routes the customer to Contact / email support.
 *
 * No backend, no database, no network calls: responses are generated locally.
 * The conversation is kept in sessionStorage (non-sensitive) so it survives
 * storefront navigation and minimize, and clears when the tab closes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  generateAiResponse,
  webActionHref,
  QUICK_PROMPTS,
  type AiAction,
} from '@/lib/ai-concierge'

type Sender = 'user' | 'assistant'

interface ChatMessage {
  id: string
  sender: Sender
  text: string
  /** ISO timestamp; formatted for display at render time. */
  at: string
  suggestedFollowUps?: string[]
  action?: AiAction
}

const STORAGE_KEY = 'repixl:chat'
const WELCOME_TEXT = `👋 Hi! I'm the RePXL AI Concierge — an automated assistant (not a human agent).

Ask me about:
• Vintage CCD camera recommendations
• Condition grading, batteries, SD cards & photo transfers
• Orders, shipping, payments & 14-day returns

For anything I can't resolve, I'll point you to our human support team.`

function makeWelcome(): ChatMessage {
  return {
    id: 'welcome',
    sender: 'assistant',
    at: new Date().toISOString(),
    text: WELCOME_TEXT,
    suggestedFollowUps: QUICK_PROMPTS.slice(0, 4),
    action: { type: 'browse', label: 'Explore Vintage Cameras' },
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── Lightweight, safe formatter for the concierge's markdown-ish text ─────────
// Supports **bold**, `code`, bullet (• / -), numbered lists, and 💡/⚠️/🚨
// callouts. All text is rendered as React text nodes (never dangerouslySetInnerHTML),
// so it is inherently XSS-safe.
function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n')
  const renderInline = (line: string, key: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${key}-${i}`} className="font-semibold text-repixl-text-light">{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={`${key}-${i}`} className="rounded bg-repixl-bg px-1 py-0.5 font-mono text-[11px] text-repixl-red">{part.slice(1, -1)}</code>
      }
      return <span key={`${key}-${i}`}>{part}</span>
    })
  }
  return (
    <div className="space-y-1">
      {lines.map((raw, idx) => {
        const line = raw.trim()
        if (!line) return <div key={idx} className="h-1.5" />
        if (line.startsWith('💡') || line.startsWith('⚠️') || line.startsWith('🚨')) {
          return (
            <p key={idx} className="rounded-md border-l-2 border-repixl-red/60 bg-repixl-red/5 px-2 py-1 text-[12.5px] leading-relaxed">
              {renderInline(line, `c-${idx}`)}
            </p>
          )
        }
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <p key={idx} className="flex gap-1.5 text-[12.5px] leading-relaxed">
              <span aria-hidden className="mt-[2px] text-repixl-red">•</span>
              <span>{renderInline(line.slice(2), `b-${idx}`)}</span>
            </p>
          )
        }
        const num = line.match(/^(\d+)\.\s+(.*)/)
        if (num) {
          return (
            <p key={idx} className="flex gap-1.5 text-[12.5px] leading-relaxed">
              <span aria-hidden className="font-mono text-[11px] text-repixl-red">{num[1]}.</span>
              <span>{renderInline(num[2], `n-${idx}`)}</span>
            </p>
          )
        }
        return <p key={idx} className="text-[12.5px] leading-relaxed">{renderInline(line, `p-${idx}`)}</p>
      })}
    </div>
  )
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([makeWelcome()])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef(false)

  // ── Load persisted conversation (survives navigation + minimize) ──────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { messages?: ChatMessage[]; open?: boolean }
        if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          setMessages(parsed.messages)
        }
        if (typeof parsed.open === 'boolean') setOpen(parsed.open)
      }
    } catch {
      /* corrupt/unavailable storage — start fresh, non-fatal */
    }
    setHydrated(true)
  }, [])

  // ── Persist (non-sensitive support conversation only) ─────────────────────
  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, open }))
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, [messages, open, hydrated])

  // ── Autoscroll to newest message ──────────────────────────────────────────
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping, open])

  // ── Focus the input when opened; return focus to launcher on close ────────
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current) }, [])

  // ── Escape closes the panel ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        launcherRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const send = useCallback((textToSend?: string) => {
    const text = (textToSend ?? input).trim()
    if (!text) return // empty messages cannot be submitted
    if (pendingRef.current) return // prevent duplicate submission while typing
    pendingRef.current = true
    setError(null)

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput('')
    setIsTyping(true)

    typingTimer.current = setTimeout(() => {
      try {
        const reply = generateAiResponse(text)
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            sender: 'assistant',
            text: reply.text,
            at: new Date().toISOString(),
            suggestedFollowUps: reply.suggestedFollowUps,
            action: reply.action,
          },
        ])
      } catch {
        setError('Something went wrong generating a reply. Please try again.')
      } finally {
        setIsTyping(false)
        pendingRef.current = false
      }
    }, 500)
  }, [input])

  const retry = useCallback(() => {
    // Re-send the last user message.
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user')
    if (lastUser) send(lastUser.text)
  }, [messages, send])

  const clearChat = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current)
    pendingRef.current = false
    setIsTyping(false)
    setError(null)
    setMessages([makeWelcome()])
  }, [])

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
    // Shift+Enter falls through → inserts a newline (default textarea behavior)
  }

  const canSend = input.trim().length > 0 && !isTyping

  const unreadHint = useMemo(() => messages.length <= 1, [messages.length])

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col items-end"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      {/* ── Panel ── */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="RePXL AI Concierge chat"
          aria-modal="false"
          className={[
            'mb-3 flex flex-col overflow-hidden rounded-2xl border border-repixl-muted/20 bg-repixl-bg shadow-2xl shadow-black/40',
            'motion-safe:animate-[chatIn_180ms_ease-out]',
            'w-[min(23rem,calc(100vw-2rem))] h-[min(34rem,calc(100vh-7rem))]',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-repixl-muted/15 bg-repixl-charcoal px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-repixl-red/15 text-repixl-red" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg>
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-repixl-text-light">RePXL AI Concierge</p>
                <p className="truncate font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Automated assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                className="rounded-md px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider text-repixl-muted transition-colors hover:bg-repixl-bg hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
                aria-label="Clear conversation"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); launcherRef.current?.focus() }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-repixl-muted transition-colors hover:bg-repixl-bg hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
                aria-label="Minimize chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 15l6-6 6 6" /></svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
            aria-live="polite"
            aria-atomic="false"
          >
            {messages.map((m) => (
              <div key={m.id} className={m.sender === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={m.sender === 'user' ? 'max-w-[85%]' : 'max-w-[92%]'}>
                  <div
                    className={[
                      'rounded-2xl px-3 py-2',
                      m.sender === 'user'
                        ? 'rounded-br-sm bg-repixl-red text-white'
                        : 'rounded-bl-sm border border-repixl-muted/15 bg-repixl-charcoal text-repixl-text-light/90',
                    ].join(' ')}
                  >
                    {m.sender === 'assistant'
                      ? <FormattedText text={m.text} />
                      : <p className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed">{m.text}</p>}
                  </div>
                  <p className={['mt-1 font-mono text-[9px] text-repixl-muted/60', m.sender === 'user' ? 'text-right' : 'text-left'].join(' ')}>
                    {m.sender === 'assistant' ? 'Concierge' : 'You'} · {formatTime(m.at)}
                  </p>

                  {/* Assistant action button (navigates to a real storefront route) */}
                  {m.sender === 'assistant' && m.action && webActionHref(m.action) && (
                    <Link
                      href={webActionHref(m.action) as string}
                      onClick={() => setOpen(false)}
                      className="mt-1 inline-flex items-center gap-1 rounded-lg border border-repixl-red/40 px-3 py-1.5 text-[11px] font-semibold text-repixl-red transition-colors hover:bg-repixl-red/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
                    >
                      {m.action.label}
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </Link>
                  )}

                  {/* Suggested follow-up chips */}
                  {m.sender === 'assistant' && m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.suggestedFollowUps.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => send(s)}
                          disabled={isTyping}
                          className="rounded-full border border-repixl-muted/25 px-2.5 py-1 text-[11px] text-repixl-text-light/80 transition-colors hover:border-repixl-red/50 hover:text-repixl-text-light disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start" aria-hidden>
                <div className="rounded-2xl rounded-bl-sm border border-repixl-muted/15 bg-repixl-charcoal px-3 py-2.5">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-repixl-muted [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-repixl-muted [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-repixl-muted" />
                  </span>
                </div>
              </div>
            )}
            {isTyping && <span className="sr-only" aria-live="polite">Concierge is typing…</span>}

            {/* Error + retry */}
            {error && (
              <div className="flex flex-col items-start gap-1.5 rounded-lg border border-repixl-red/30 bg-repixl-red/5 px-3 py-2">
                <p className="text-[12px] text-repixl-text-light/80">{error}</p>
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-md border border-repixl-red/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-red transition-colors hover:bg-repixl-red/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-repixl-muted/15 bg-repixl-charcoal/60 p-2.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                rows={1}
                placeholder="Ask about cameras, orders, returns…"
                aria-label="Message the RePXL AI Concierge"
                className="max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-repixl-muted/20 bg-repixl-bg px-3 py-2 text-[13px] text-repixl-text-light placeholder:text-repixl-muted/60 focus:border-repixl-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/30"
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={!canSend}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-repixl-red text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-repixl-bg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></svg>
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[9px] text-repixl-muted/50">Automated assistant · Enter to send · Shift+Enter for a new line</p>
          </div>
        </div>
      )}

      {/* ── Launcher ── */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open RePXL AI Concierge chat'}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-repixl-red text-white shadow-lg shadow-black/30 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/60 focus-visible:ring-offset-2 focus-visible:ring-offset-repixl-bg motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
        )}
        {/* Subtle attention dot on first load before opening */}
        {!open && unreadHint && (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-repixl-bg bg-repixl-text-light" aria-hidden />
        )}
      </button>
    </div>
  )
}
