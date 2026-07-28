import Link from 'next/link'
import { Container } from './Container'
import { CornerBracket } from '@/components/ui'
import { FooterLegalLinks } from './FooterLegalLinks'

const shopLinks = [
  { label: 'All Cameras', href: '/products' },
  { label: 'Compare', href: '/compare' },
  { label: 'New Arrivals', href: '/products?sort=newest' },
  { label: 'Search', href: '/search' },
]

const supportLinks = [
  { label: 'Condition Grading', href: '#' },
  { label: 'Shipping & Returns', href: '#' },
  { label: 'FAQ', href: '#' },
  { label: 'Contact Us', href: '#' },
]

const companyLinks = [
  { label: 'About RePIXL', href: '/about' },
  { label: 'My Account', href: '/account' },
  { label: 'Sign In', href: '/login' },
]

export function Footer() {
  return (
    <footer className="border-t border-repixl-muted/10 bg-repixl-bg pt-16 pb-8">
      <Container>
        {/* Main grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column — wider */}
          <div className="lg:col-span-2">
            <CornerBracket size={8} color="rgba(245, 241, 236, 0.3)" className="mb-4 inline-block px-2 py-1">
              <span className="font-display text-lg font-semibold tracking-tight text-repixl-text-light">
                RePIXL
              </span>
            </CornerBracket>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-repixl-text-light/60">
              The curated marketplace for vintage digital cameras.
              Condition-graded, serial-verified, and trusted by collectors
              since 2024.
            </p>

            {/* Social icons */}
            <div className="mt-6 flex items-center gap-4">
              {/* Instagram */}
              <a
                href="#"
                aria-label="Instagram"
                className="text-repixl-muted transition-colors hover:text-repixl-text-light"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              {/* Twitter/X */}
              <a
                href="#"
                aria-label="Twitter"
                className="text-repixl-muted transition-colors hover:text-repixl-text-light"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              {/* TikTok */}
              <a
                href="#"
                aria-label="TikTok"
                className="text-repixl-muted transition-colors hover:text-repixl-text-light"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </a>
              {/* YouTube */}
              <a
                href="#"
                aria-label="YouTube"
                className="text-repixl-muted transition-colors hover:text-repixl-text-light"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                  <path d="m10 15 5-3-5-3z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Shop column */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-repixl-muted">
              Shop
            </h4>
            <ul className="mt-4 space-y-2.5">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-repixl-text-light/70 transition-colors hover:text-repixl-text-light">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support column */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-repixl-muted">
              Support
            </h4>
            <ul className="mt-4 space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-repixl-text-light/70 transition-colors hover:text-repixl-text-light">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-repixl-muted">
              Company
            </h4>
            <ul className="mt-4 space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-repixl-text-light/70 transition-colors hover:text-repixl-text-light">
                    {link.label}
                  </Link>
                </li>
              ))}
              <FooterLegalLinks />
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-repixl-muted/10 pt-6 md:flex-row">
          <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
            © 2026 RePIXL. All rights reserved.
          </p>

          {/* Payment method icons */}
          <div className="flex items-center gap-3">
            {/* Visa */}
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="20" viewBox="0 0 32 20" fill="none" aria-label="Visa">
              <rect width="32" height="20" rx="3" fill="#1a1816" stroke="#3d3538" strokeWidth="0.5" />
              <text x="16" y="13" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill="#F5F1EC">VISA</text>
            </svg>
            {/* Mastercard */}
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="20" viewBox="0 0 32 20" fill="none" aria-label="Mastercard">
              <rect width="32" height="20" rx="3" fill="#1a1816" stroke="#3d3538" strokeWidth="0.5" />
              <circle cx="13" cy="10" r="5" fill="#C22C2C" opacity="0.8" />
              <circle cx="19" cy="10" r="5" fill="#C98A2B" opacity="0.8" />
            </svg>
            {/* GCash */}
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="20" viewBox="0 0 32 20" fill="none" aria-label="GCash">
              <rect width="32" height="20" rx="3" fill="#1a1816" stroke="#3d3538" strokeWidth="0.5" />
              <text x="16" y="13" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fontWeight="bold" fill="#5A6E4E">GCash</text>
            </svg>
            {/* PayPal */}
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="20" viewBox="0 0 32 20" fill="none" aria-label="PayPal">
              <rect width="32" height="20" rx="3" fill="#1a1816" stroke="#3d3538" strokeWidth="0.5" />
              <text x="16" y="13" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fontWeight="bold" fill="#4a90d9">PayPal</text>
            </svg>
          </div>
        </div>
      </Container>
    </footer>
  )
}
