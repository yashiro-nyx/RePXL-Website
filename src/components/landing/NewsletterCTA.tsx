'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { RevealText } from '@/components/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useToastStore } from '@/stores/toastStore'

function getSubscribers(): string[] {
  try {
    const stored = localStorage.getItem('repixl-newsletter-subscribers')
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function saveSubscriber(email: string): boolean {
  const subscribers = getSubscribers()
  if (subscribers.includes(email.toLowerCase())) return false // duplicate
  subscribers.push(email.toLowerCase())
  localStorage.setItem('repixl-newsletter-subscribers', JSON.stringify(subscribers))
  return true
}

export function NewsletterCTA() {
  const reducedMotion = useReducedMotion()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const addToast = useToastStore((s) => s.addToast)

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.')
      return
    }

    if (!validateEmail(email.trim())) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    setStatus('loading')

    // Simulate a brief network delay for realism
    await new Promise((resolve) => setTimeout(resolve, 500))

    try {
      const saved = saveSubscriber(email.trim())
      if (!saved) {
        setErrorMsg('This email is already subscribed.')
        setStatus('idle')
        return
      }
      setStatus('success')
      setEmail('')
      addToast('Thanks for subscribing! Welcome to the collector community.')
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <section className="py-20 md:py-28">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-40px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-lg text-center"
        >
          <RevealText
            as="h2"
            text="Stay in the loop"
            className="font-display text-display-sm text-repixl-text-light md:text-display-md"
          />
          <p className="mt-2 text-sm text-repixl-text-light/60">
            New arrivals, restocks, and collector tips — no spam, just cameras.
          </p>

          {status === 'success' ? (
            <div className="mt-8 rounded-lg border border-repixl-success/30 bg-repixl-success/10 px-5 py-4">
              <div className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success"><path d="M20 6 9 17l-5-5" /></svg>
                <p className="text-sm font-medium text-repixl-success">You&apos;re subscribed!</p>
              </div>
              <p className="mt-1 text-xs text-repixl-muted">We&apos;ll keep you posted on new arrivals and restocks.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-3 sm:flex-row">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <div className="flex-1">
                <input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrorMsg('') }}
                  placeholder="you@example.com"
                  disabled={status === 'loading'}
                  className={`w-full rounded border px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/60 focus:outline-none focus:ring-1 transition-colors ${
                    errorMsg
                      ? 'border-red-400/60 bg-red-400/5 focus:border-red-400 focus:ring-red-400/20'
                      : 'border-repixl-muted/20 bg-repixl-charcoal focus:border-repixl-muted/50 focus:ring-repixl-muted/30'
                  } disabled:opacity-60`}
                />
                {errorMsg && <p className="mt-1.5 text-left text-xs text-red-400">{errorMsg}</p>}
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="inline-flex items-center justify-center rounded bg-repixl-red px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    Subscribing...
                  </span>
                ) : 'Subscribe'}
              </button>
            </form>
          )}

          <p className="mt-4 font-mono text-[10px] text-repixl-muted">
            Unsubscribe anytime. We respect your inbox.
          </p>
        </motion.div>
      </Container>
    </section>
  )
}