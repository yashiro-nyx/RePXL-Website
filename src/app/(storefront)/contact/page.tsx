'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { RevealText } from '@/components/ui/RevealText'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useToastStore } from '@/stores/toastStore'

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

const subjectOptions = [
  'General Inquiry',
  'Order Issue',
  'Condition Concern',
  'Selling a Camera',
  'Other',
]

const infoItems = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    label: 'Email',
    value: 'support@repxl.com',
    href: 'mailto:support@repxl.com',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    label: 'Response Time',
    value: 'Within 24 hours on business days',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    label: 'Condition Disputes',
    value: 'Prioritized — we respond same-day',
  },
]

export default function ContactPage() {
  const reducedMotion = useReducedMotion()
  const router = useRouter()
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [errors, setErrors] = useState<Partial<ContactFormData>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [apiError, setApiError] = useState('')
  const addToast = useToastStore((state) => state.addToast)

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validate = (): boolean => {
    const newErrors: Partial<ContactFormData> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.subject) {
      newErrors.subject = 'Please select a subject'
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setApiError('')
    setStatus('loading')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (res.status === 429) {
        setApiError('Too many requests. Please try again later.')
        setStatus('error')
        return
      }
      if (!res.ok) {
        setApiError(data.message ?? 'Unable to send your message. Please try again.')
        setStatus('error')
        return
      }

      setStatus('success')
      addToast('Message sent successfully. We\'ll get back to you soon.', 'success')
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch {
      setApiError('Unable to send your message. Please try again.')
      setStatus('error')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof ContactFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const pickSubject = (subject: string) => {
    setFormData((prev) => ({ ...prev, subject }))
    if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }))
  }

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: reducedMotion ? 0 : 0.08, delayChildren: reducedMotion ? 0 : 0.1 },
    },
  }
  const item = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.45, ease: 'easeOut' } },
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden pb-16 pt-32 md:pb-20 md:pt-40">
        <div
          className="pointer-events-none absolute inset-0 -z-10 flex select-none items-center justify-center"
          aria-hidden="true"
        >
          <span
            className="whitespace-nowrap font-display font-bold uppercase leading-none tracking-tighter text-white/[0.04]"
            style={{ fontSize: 'clamp(9rem, 18vw, 20rem)' }}
          >
            REACH
          </span>
        </div>

        <Container>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-repixl-muted transition-colors hover:text-repixl-text-light"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
            Back
          </button>
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-5 block font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — Get in Touch
            </span>
            <h1 className="font-display text-display-lg text-repixl-text-light md:text-display-xl">
              <RevealText text="Contact Us" as="span" />
            </h1>
            <motion.p
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.3 }}
              className="mx-auto mt-4 max-w-lg text-sm text-repixl-text-light/70"
            >
              Questions about an order, condition grade, or selling your cameras?
              We&apos;re here to help.
            </motion.p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-12 md:grid-cols-5">
            {/* Contact Info Sidebar */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="md:col-span-2"
            >
              <motion.div
                variants={item}
                className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6"
              >
                <h3 className="font-display text-sm font-semibold text-repixl-text-light">
                  Other ways to reach us
                </h3>
                <div className="mt-5 space-y-4">
                  {infoItems.map((info) => (
                    <motion.div
                      key={info.label}
                      variants={item}
                      className="group flex items-start gap-3"
                    >
                      <span className="mt-0.5 text-repixl-muted transition-colors duration-300 group-hover:text-repixl-red">
                        {info.icon}
                      </span>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                          {info.label}
                        </p>
                        {info.href ? (
                          <a
                            href={info.href}
                            className="mt-1 block text-sm text-repixl-text-light/80 transition-colors hover:text-repixl-text-light"
                          >
                            {info.value}
                          </a>
                        ) : (
                          <p className="mt-1 text-sm text-repixl-text-light/80">
                            {info.value}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Quick-reply chips */}
              <motion.div variants={item} className="mt-5 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6">
                <h3 className="font-display text-sm font-semibold text-repixl-text-light">
                  What&apos;s this about?
                </h3>
                <p className="mt-1 text-xs text-repixl-text-light/50">
                  Tap one to pre-fill the subject below.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {subjectOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => pickSubject(option)}
                      className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors duration-200 ${
                        formData.subject === option
                          ? 'border-repixl-red bg-repixl-red text-white'
                          : 'border-repixl-muted/20 text-repixl-muted hover:border-repixl-red/40 hover:text-repixl-red'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            {/* Contact Form */}
            <div className="md:col-span-3">
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div
                    key="success"
                    initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                    transition={{ duration: reducedMotion ? 0 : 0.4, ease: 'easeOut' }}
                    className="rounded-lg border border-repixl-success/30 bg-repixl-success/10 p-8 text-center"
                  >
                    <motion.span
                      initial={reducedMotion ? { scale: 1 } : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.34, 1.56, 0.64, 1], delay: reducedMotion ? 0 : 0.1 }}
                      className="mx-auto block text-repixl-success"
                    >
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </motion.span>
                    <h3 className="mt-4 font-display text-lg font-semibold text-repixl-text-light">
                      Message Sent
                    </h3>
                    <p className="mt-2 text-sm text-repixl-text-light/70">
                      Thanks for reaching out. We&apos;ll get back to you within 24
                      hours on business days.
                    </p>
                    <button
                      onClick={() => { setStatus('idle'); setApiError('') }}
                      className="mt-6 text-sm text-repixl-red transition-colors hover:text-repixl-red/80"
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.3 }}
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    noValidate
                  >
                    {/* Name */}
                    <motion.div
                      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.1 }}
                    >
                      <label htmlFor="name" className="block font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`mt-2 w-full rounded-md border bg-repixl-charcoal px-4 py-2.5 text-sm text-repixl-text-light placeholder-repixl-muted/50 outline-none transition-colors focus:border-repixl-red/50 focus:ring-1 focus:ring-repixl-red/20 ${
                          errors.name ? 'border-repixl-red/50' : 'border-repixl-muted/20'
                        }`}
                        placeholder="Your full name"
                      />
                      <AnimatePresence>
                        {errors.name && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-1.5 text-xs text-repixl-red"
                          >
                            {errors.name}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Email */}
                    <motion.div
                      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.15 }}
                    >
                      <label htmlFor="email" className="block font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`mt-2 w-full rounded-md border bg-repixl-charcoal px-4 py-2.5 text-sm text-repixl-text-light placeholder-repixl-muted/50 outline-none transition-colors focus:border-repixl-red/50 focus:ring-1 focus:ring-repixl-red/20 ${
                          errors.email ? 'border-repixl-red/50' : 'border-repixl-muted/20'
                        }`}
                        placeholder="your@email.com"
                      />
                      <AnimatePresence>
                        {errors.email && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-1.5 text-xs text-repixl-red"
                          >
                            {errors.email}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Subject */}
                    <motion.div
                      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.2 }}
                    >
                      <label htmlFor="subject" className="block font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                        Subject
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className={`mt-2 w-full rounded-md border bg-repixl-charcoal px-4 py-2.5 text-sm text-repixl-text-light outline-none transition-colors focus:border-repixl-red/50 focus:ring-1 focus:ring-repixl-red/20 ${
                          errors.subject ? 'border-repixl-red/50' : 'border-repixl-muted/20'
                        } ${!formData.subject ? 'text-repixl-muted/50' : ''}`}
                      >
                        <option value="" disabled>
                          Select a subject
                        </option>
                        {subjectOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <AnimatePresence>
                        {errors.subject && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-1.5 text-xs text-repixl-red"
                          >
                            {errors.subject}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Message */}
                    <motion.div
                      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.25 }}
                    >
                      <label htmlFor="message" className="block font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={5}
                        className={`mt-2 w-full resize-none rounded-md border bg-repixl-charcoal px-4 py-2.5 text-sm text-repixl-text-light placeholder-repixl-muted/50 outline-none transition-colors focus:border-repixl-red/50 focus:ring-1 focus:ring-repixl-red/20 ${
                          errors.message ? 'border-repixl-red/50' : 'border-repixl-muted/20'
                        }`}
                        placeholder="Tell us how we can help..."
                      />
                      <AnimatePresence>
                        {errors.message && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-1.5 text-xs text-repixl-red"
                          >
                            {errors.message}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* API error */}
                    {apiError && (
                      <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2">
                        <p className="text-xs text-red-400">{apiError}</p>
                      </div>
                    )}

                    {/* Submit */}
                    <motion.button
                      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : 0.3 }}
                      whileHover={reducedMotion ? undefined : { scale: 1.01 }}
                      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                      type="submit"
                      disabled={status === 'loading'}
                      className="w-full rounded-md bg-repixl-red px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-repixl-red/90 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {status === 'loading' ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sending...
                        </span>
                      ) : 'Send Message'}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Container>
      </section>


    </div>
  )
}