'use client'

import { useState } from 'react'
import { LegalModal } from '@/components/ui'
import { termsContent, privacyContent } from '@/data/legal'

export function FooterLegalLinks() {
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)

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
        content={termsContent}
      />
      <LegalModal
        isOpen={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Privacy Policy"
        content={privacyContent}
      />
    </>
  )
}
