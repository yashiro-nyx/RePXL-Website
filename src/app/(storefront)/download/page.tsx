'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { BackButton, Button } from '@/components/ui'
import { Footer } from '@/components/layout/Footer'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import {
  MOBILE_APP_RELEASE,
  MOBILE_FEATURE_HIGHLIGHTS,
  ANDROID_INSTALL_STEPS,
} from '@/lib/mobile-download'

export default function MobileDownloadPage() {
  const reducedMotion = useReducedMotion()
  const [copiedHash, setCopiedHash] = useState(false)
  const [downloadTriggered, setDownloadTriggered] = useState(false)

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(MOBILE_APP_RELEASE.sha256)
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleDownloadClick = () => {
    setDownloadTriggered(true)
    setTimeout(() => setDownloadTriggered(false), 5000)
  }

  return (
    <div className="min-h-screen bg-repixl-bg pt-24 pb-16 text-repixl-text-light">
      <Container>
        {/* Back navigation */}
        <div className="mb-6">
          <BackButton fallback="/" label="Home" />
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-repixl-muted/20 bg-gradient-to-b from-repixl-charcoal/90 via-repixl-charcoal/60 to-repixl-bg p-6 md:p-12 lg:p-16">
          <div className="relative z-10 grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {/* Left Column: Headlines & CTA */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-repixl-red/40 bg-repixl-red/10 px-3.5 py-1 text-xs font-mono uppercase tracking-wider text-repixl-red">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-repixl-red opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-repixl-red" />
                </span>
                Official Mobile App • v{MOBILE_APP_RELEASE.version}
              </div>

              <h1 className="mt-5 font-display text-3xl font-black uppercase tracking-tight text-repixl-text-light sm:text-5xl lg:text-6xl">
                Carry the Vault in Your Pocket.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-repixl-text-light/75 sm:text-lg">
                Explore rare CCD digicams, compare CCD/CMOS sensor specs side-by-side,
                track order delivery milestones with push updates, and consult the AI Concierge on the go.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <a
                  href={MOBILE_APP_RELEASE.apiDownloadPath}
                  onClick={handleDownloadClick}
                  download={MOBILE_APP_RELEASE.apkFileName}
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-repixl-red px-6 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-repixl-red/30 transition-all hover:bg-red-700 hover:shadow-xl active:scale-[0.98]"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download Android APK ({MOBILE_APP_RELEASE.fileSizeFormatted})</span>
                </a>

                <a
                  href="#install-guide"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-repixl-muted/40 bg-repixl-charcoal/80 px-5 py-3.5 font-mono text-xs uppercase tracking-wider text-repixl-text-light transition-colors hover:border-repixl-text-light hover:bg-repixl-charcoal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Install Guide</span>
                </a>
              </div>

              {downloadTriggered && (
                <div
                  role="status"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-mono text-xs text-emerald-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Download started! Check your browser's download notifications.</span>
                </div>
              )}

              {/* Security strip */}
              <div className="mt-8 flex flex-wrap items-center gap-y-2 gap-x-6 border-t border-repixl-muted/15 pt-6 font-mono text-xs text-repixl-muted">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-emerald-400"
                    aria-hidden="true"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Signed &amp; Verified APK</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-blue-400"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Android 7.0 to 17 Supported</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-amber-400"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Direct Collector Build</span>
                </div>
              </div>
            </div>

            {/* Right Column: App Mockup Preview & QR Code */}
            <div className="flex flex-col items-center justify-center gap-6 lg:col-span-5">
              <div className="relative w-full max-w-xs sm:max-w-sm">
                {/* Glow behind device */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-repixl-red/20 via-amber-500/10 to-transparent blur-2xl"
                />

                {/* Device shell */}
                <div className="relative mx-auto overflow-hidden rounded-[2.5rem] border-4 border-repixl-muted/40 bg-black shadow-2xl shadow-black/80">
                  {/* Speaker pill */}
                  <div className="absolute top-3 left-1/2 z-20 h-4 w-24 -translate-x-1/2 rounded-full bg-neutral-900" />
                  
                  {/* Phone screen screenshot */}
                  <div className="relative aspect-[9/19.5] w-full overflow-hidden bg-neutral-950">
                    <Image
                      src="/images/mobile-app-preview.png"
                      alt="RePXL Mobile App Home Screen on Pixel 10 Pro"
                      fill
                      priority
                      className="object-cover object-top"
                      sizes="(min-width: 1024px) 320px, 280px"
                    />
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                    Pixel 10 Pro Standalone Installation
                  </span>
                </div>
              </div>

              {/* Desktop QR Code quick scan */}
              <div className="hidden w-full max-w-xs items-center gap-4 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal/70 p-4 sm:flex">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-repixl-muted/30 bg-white p-1">
                  <Image
                    src="/api/download/qr?target=apk&size=160"
                    alt="Scan QR code to download RePXL Mobile"
                    width={80}
                    height={80}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-xs font-bold uppercase tracking-wider text-repixl-text-light">
                    Scan with Phone
                  </p>
                  <p className="mt-1 font-mono text-[11px] leading-tight text-repixl-muted">
                    Point your camera to download the APK straight to your device.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="mt-20">
          <div className="text-center">
            <span className="font-mono text-xs uppercase tracking-widest text-repixl-red">
              Engineered For Vintage Collectors
            </span>
            <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-tight text-repixl-text-light sm:text-4xl">
              Native Performance. Complete Feature Parity.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-repixl-text-light/70 sm:text-base">
              The mobile client shares our live PostgreSQL database, authentication rules,
              and returns system. Everything you save, order, or review on web is available instantly.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MOBILE_FEATURE_HIGHLIGHTS.map((f) => (
              <div
                key={f.id}
                className="group relative rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal/40 p-6 transition-all hover:border-repixl-red/40 hover:bg-repixl-charcoal/70"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                    {f.category}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-repixl-red/10 text-repixl-red">
                    {f.iconName === 'camera' && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                    )}
                    {f.iconName === 'compare' && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/></svg>
                    )}
                    {f.iconName === 'truck' && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14v10Z"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
                    )}
                    {f.iconName === 'bot' && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                    )}
                    {f.iconName === 'shield' && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    )}
                    {f.iconName === 'bell' && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                    )}
                  </div>
                </div>

                <h3 className="mt-4 font-display text-base font-bold uppercase tracking-tight text-repixl-text-light">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-repixl-text-light/70">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Technical Specs & Verification Card */}
        <section className="mt-20">
          <div className="rounded-3xl border border-repixl-muted/20 bg-repixl-charcoal/50 p-6 sm:p-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-repixl-red">
                  Package Integrity &amp; Verification
                </span>
                <h2 className="mt-1 font-display text-xl font-bold uppercase tracking-tight text-repixl-text-light sm:text-2xl">
                  Release v{MOBILE_APP_RELEASE.version} Specifications
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={MOBILE_APP_RELEASE.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-repixl-muted hover:text-repixl-text-light underline transition-colors"
                >
                  Direct EAS CDN Link
                </a>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-repixl-muted/15 bg-repixl-bg/70 p-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Package Name</span>
                <p className="mt-1 font-mono text-sm font-semibold text-repixl-text-light">{MOBILE_APP_RELEASE.packageName}</p>
              </div>

              <div className="rounded-xl border border-repixl-muted/15 bg-repixl-bg/70 p-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">File Size</span>
                <p className="mt-1 font-mono text-sm font-semibold text-repixl-text-light">{MOBILE_APP_RELEASE.fileSizeFormatted} ({MOBILE_APP_RELEASE.fileSizeBytes.toLocaleString()} bytes)</p>
              </div>

              <div className="rounded-xl border border-repixl-muted/15 bg-repixl-bg/70 p-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Compatibility</span>
                <p className="mt-1 font-mono text-sm font-semibold text-repixl-text-light">Android 7.0+ (API 24 to 37)</p>
              </div>

              <div className="rounded-xl border border-repixl-muted/15 bg-repixl-bg/70 p-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Signature</span>
                <p className="mt-1 font-mono text-sm font-semibold text-emerald-400">Scheme v2 Verified</p>
              </div>
            </div>

            {/* Checksum Row */}
            <div className="mt-4 rounded-xl border border-repixl-muted/15 bg-repixl-bg/70 p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                  SHA-256 Cryptographic Checksum
                </span>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-repixl-red hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  <span>{copiedHash ? 'Checksum Copied!' : 'Copy SHA-256'}</span>
                </button>
              </div>
              <p className="mt-1 break-all font-mono text-xs text-repixl-text-light/90">
                {MOBILE_APP_RELEASE.sha256}
              </p>
            </div>
          </div>
        </section>

        {/* Step-by-Step Installation Guide */}
        <section id="install-guide" className="mt-20 scroll-mt-28">
          <div className="text-center">
            <span className="font-mono text-xs uppercase tracking-widest text-repixl-red">
              Easy Android Setup
            </span>
            <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-tight text-repixl-text-light sm:text-4xl">
              How to Install on Your Android Device
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-repixl-text-light/70 sm:text-base">
              Because this is a standalone release directly from our engineering team,
              Android will ask for confirmation before installing. Follow these 4 quick steps:
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {ANDROID_INSTALL_STEPS.map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal/40 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-repixl-red font-mono text-sm font-bold text-white shadow-md shadow-repixl-red/20">
                    0{s.step}
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold uppercase tracking-tight text-repixl-text-light">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-repixl-text-light/70">
                    {s.instruction}
                  </p>
                </div>
                {s.note && (
                  <p className="mt-4 border-t border-repixl-muted/15 pt-3 font-mono text-[11px] text-repixl-muted">
                    💡 {s.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* iOS Notice Strip */}
        <section className="mt-16 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>
              </div>
              <div>
                <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-blue-400">
                  <span>Apple iOS &amp; iPhone Status</span>
                  <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px]">TestFlight Candidate</span>
                </div>
                <h3 className="mt-1 font-display text-lg font-bold uppercase tracking-tight text-repixl-text-light">
                  iOS Build in Progress
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-repixl-text-light/70">
                  Native iOS export has passed ({MOBILE_APP_RELEASE.iosModulesBundled.toLocaleString()} modules). We are currently conducting internal TestFlight candidate acceptance. Stay tuned for public App Store availability!
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <Link
                href="/newsletter"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-400/40 bg-blue-500/10 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-blue-300 transition-colors hover:bg-blue-500/20"
              >
                <span>Notify me for iOS</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Mobile App FAQs */}
        <section className="mt-20">
          <div className="text-center">
            <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
              Frequently Asked Questions
            </span>
            <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-tight text-repixl-text-light sm:text-3xl">
              About the RePXL Mobile App
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal/40 p-6">
              <h3 className="font-display text-base font-bold text-repixl-text-light">
                Why is the app distributed as an APK instead of Google Play right now?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-repixl-text-light/70">
                Direct APK distribution allows our vintage collector community to test and experience the full application immediately without waiting for standard app store review delays. The build is cryptographically signed with our verified release certificate.
              </p>
            </div>

            <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal/40 p-6">
              <h3 className="font-display text-base font-bold text-repixl-text-light">
                Do my website cart, wishlist, and orders synchronize with the app?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-repixl-text-light/70">
                Yes! RePXL Mobile connects directly to our centralized server and PostgreSQL database. When you log in with your email or Google account, your saved addresses, cart items, purchase history, and notifications will be in complete sync.
              </p>
            </div>

            <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal/40 p-6">
              <h3 className="font-display text-base font-bold text-repixl-text-light">
                How do I receive future app updates?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-repixl-text-light/70">
                When an update is released, you can download the updated APK from this page. Running the new APK will automatically update the app on your Android device without erasing your stored login session or preferences.
              </p>
            </div>
          </div>
        </section>
      </Container>

      {/* Footer */}
      <div className="mt-24">
        <Footer />
      </div>
    </div>
  )
}

