'use client'

import { useState } from 'react'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
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

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [errors, setErrors] = useState<Partial<ContactFormData>>({})
  const [submitted, setSubmitted] = useState(false)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const submission = {
      ...formData,
      timestamp: new Date().toISOString(),
    }

    const existing = JSON.parse(
      localStorage.getItem('repxl-contact-submissions') || '[]'
    )
    existing.push(submission)
    localStorage.setItem(
      'repxl-contact-submissions',
      JSON.stringify(existing)
    )

    setSubmitted(true)
    addToast('Message sent successfully. We\'ll get back to you soon.', 'success')
    setFormData({ name: '', email: '', subject: '', message: '' })
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

  return (
    <div>
      <section className="pb-20 pt-32 md:pb-28 md:pt-40">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-5 block font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — Get in Touch
            </span>
            <h1 className="font-display text-display-lg text-repixl-text-light md:text-display-xl">
              Contact Us
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm text-repixl-text-light/70">
              Questions about an order, condition grade, or selling your cameras?
              We're here to help.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-12 md:grid-cols-5">
            {/* Contact Info Sidebar */}
            <div className="md:col-span-2">
              <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6">
                <h3 className="font-display text-sm font-semibold text-repixl-text-light">
                  Other ways to reach us
                </h3>
                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-repixl-muted">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                        Email
                      </p>
                      <a
                        href="mailto:support@repxl.com"
                        className="mt-1 block text-sm text-repixl-text-light/80 transition-colors hover:text-repixl-text-light"
                      >
                        support@repxl.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-repixl-muted">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                        Response Time
                      </p>
                      <p className="mt-1 text-sm text-repixl-text-light/80">
                        Within 24 hours on business days
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-repixl-muted">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </span>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                        Condition Disputes
                      </p>
                      <p className="mt-1 text-sm text-repixl-text-light/80">
                        Prioritized — we respond same-day
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="md:col-span-3">
              {submitted ? (
                <div className="rounded-lg border border-repixl-success/30 bg-repixl-success/10 p-8 text-center">
                  <span className="mx-auto block text-repixl-success">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mx-auto"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-repixl-text-light">
                    Message Sent
                  </h3>
                  <p className="mt-2 text-sm text-repixl-text-light/70">
                    Thanks for reaching out. We&apos;ll get back to you within 24
                    hours on business days.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-sm text-repixl-red transition-colors hover:text-repixl-red/80"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block font-mono text-[10px] uppercase tracking-wider text-repixl-muted"
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`mt-2 w-full rounded-md border bg-repixl-charcoal px-4 py-2.5 text-sm text-repixl-text-light placeholder-repixl-muted/50 outline-none transition-colors focus:border-repixl-red/50 ${
                        errors.name
                          ? 'border-red-500/50'
                          : 'border-repixl-muted/20'
                      }`}
                      placeholder="Your full name"
                    />
                    {errors.name && (
                      <p className="mt-1.5 text-xs text-red-400">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block font-mono text-[10px] uppercase tracking-wider text-repixl-muted"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`mt-2 w-full rounded-md border bg-repixl-charcoal px-4 py-2.5 text-sm text-repixl-text-light placeholder-repixl-muted/50 outline-none transition-colors focus:border-repixl-red/50 ${
                        errors.email
                          ? 'border-red-500/50'
                          : 'border-repixl-muted/20'
                      }`}
                      placeholder="your@email.com"
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-400">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <label
                      htmlFor="subject"
                      className="block font-mono text-[10px] uppercase tracking-wider text-repixl-muted"
                    >
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className={`mt-2 w-full rounded-md border bg-repixl-charcoal px-4 py-2.5 text-sm text-repixl-text-light outline-none transition-colors focus:border-repixl-red/50 ${
                        errors.subject
                          ? 'border-red-500/50'
                          : 'border-repixl-muted/20'
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
                    {errors.subject && (
                      <p className="mt-1.5 text-xs text-red-400">
                        {errors.subject}
                      </p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label
                      htmlFor="message"
                      className="block font-mono text-[10px] uppercase tracking-wider text-repixl-muted"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={5}
                      className={`mt-2 w-full resize-none rounded-md border bg-repixl-charcoal px-4 py-2.5 text-sm text-repixl-text-light placeholder-repixl-muted/50 outline-none transition-colors focus:border-repixl-red/50 ${
                        errors.message
                          ? 'border-red-500/50'
                          : 'border-repixl-muted/20'
                      }`}
                      placeholder="Tell us how we can help..."
                    />
                    {errors.message && (
                      <p className="mt-1.5 text-xs text-red-400">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="w-full rounded-md bg-repixl-red px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-repixl-red/90"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}
