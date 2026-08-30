import Link from 'next/link'
import { Container } from './Container'
import { FooterLegalLinks } from './FooterLegalLinks'
import { Logo } from '@/components/ui/Logo'

const shopLinks = [
  { label: 'All Cameras', href: '/products' },
  { label: 'New Arrivals', href: '/products?sort=newest' },
  { label: 'Compare', href: '/compare' },
]

const supportLinks = [
  { label: 'Condition Grading', href: '/condition-grading' },
  { label: 'Shipping & Returns', href: '/shipping-returns' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact Us', href: '/contact' },
]

const companyLinks = [
  { label: 'About', href: '/about' },
  { label: 'My Account', href: '/account' },
  { label: 'Sign In', href: '/login' },
]

export function Footer() {
  return (
    <footer className="border-t border-repixl-muted/10 pt-16 pb-8">
      <Container>
        {/* Main grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <span className="text-repixl-text-light">
              <Logo size="md" />
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-repixl-text-light/60">
              The curated marketplace for vintage digital cameras.
              Condition-graded, serial-verified, and trusted by collectors.
            </p>
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

          {/* Company + Legal column */}
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

        {/* Giant wordmark closer */}
        <div className="mt-16 border-t border-repixl-muted/10 pt-10">
          <span
            aria-hidden="true"
            className="block select-none font-display font-bold uppercase leading-none tracking-tighter text-repixl-text-light/10"
            style={{ fontSize: 'clamp(3rem, 11vw, 8rem)' }}
          >
            RePXL
          </span>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-repixl-muted/10 pt-6 md:flex-row">
          <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
            © 2026 RePXL. All rights reserved.
          </p>

          {/* Payment method icons */}
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="20" viewBox="0 0 32 20" fill="none" aria-label="Visa">
              <rect width="32" height="20" rx="3" fill="#1a1816" stroke="#3d3538" strokeWidth="0.5" />
              <text x="16" y="13" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill="#F5F1EC">VISA</text>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="20" viewBox="0 0 32 20" fill="none" aria-label="Mastercard">
              <rect width="32" height="20" rx="3" fill="#1a1816" stroke="#3d3538" strokeWidth="0.5" />
              <circle cx="13" cy="10" r="5" fill="#C22C2C" opacity="0.8" />
              <circle cx="19" cy="10" r="5" fill="#C98A2B" opacity="0.8" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="20" viewBox="0 0 32 20" fill="none" aria-label="GCash">
              <rect width="32" height="20" rx="3" fill="#1a1816" stroke="#3d3538" strokeWidth="0.5" />
              <text x="16" y="13" textAnchor="middle" fontFamily="sans-serif" fontSize="6" fontWeight="bold" fill="#5A6E4E">GCash</text>
            </svg>
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
