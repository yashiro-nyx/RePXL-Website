'use client'

import { useState, useEffect } from 'react'
import { LegalModal } from '@/components/ui'
import { termsContent, privacyContent } from '@/data/legal'

export function FooterLegalLinks() {
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [liveTerms, setLiveTerms] = useState(termsContent)
  const [livePrivacy, setLivePrivacy] = useState(privacyContent)

  useEffect(() => {
    let isMounted = true

    // Fetch terms
    fetch('/api/pages/terms')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (isMounted && body?.data?.body?.trim()) {
          setLiveTerms(body.data.body)
        }
      })
      .catch(() => {})

    // Fetch privacy
    fetch('/api/pages/privacy')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (isMounted && body?.data?.body?.trim()) {
          setLivePrivacy(body.data.body)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <>
      <li>
        <button
          type="button"
          onClick={() => setPrivacyOpen(true)}
          className="text-sm text-repixl-text-light/70 transition-colors hover:text-repixl-text-light"
        >
          Privacy Policy
        </button>
      </li>
      <li>
        <button
          type="button"
          onClick={() => setTermsOpen(true)}
          className="text-sm text-repixl-text-light/70 transition-colors hover:text-repixl-text-light"
        >
          Terms of Service
        </button>
      </li>

      <LegalModal
        isOpen={termsOpen}
        onClose={() => setTermsOpen(false)}
        title="Terms of Service"
        content={liveTerms}
      />
      <LegalModal
        isOpen={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Privacy Policy"
        content={livePrivacy}
      />
    </>
  )
}
