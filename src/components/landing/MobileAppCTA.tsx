'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { MOBILE_APP_RELEASE } from '@/lib/mobile-download'

export function MobileAppCTA() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <Container>
        <div className="relative rounded-3xl border border-repixl-muted/20 bg-gradient-to-br from-repixl-charcoal via-repixl-charcoal/80 to-repixl-bg p-8 sm:p-12 lg:p-16">
          {/* Subtle background ambient glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-repixl-red/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl"
          />

          <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            {/* Left Content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-repixl-red/30 bg-repixl-red/10 px-3.5 py-1 text-xs font-mono uppercase tracking-wider text-repixl-red">
                <span>RePXL Mobile</span>
                <span className="text-repixl-muted">•</span>
                <span>Android v{MOBILE_APP_RELEASE.version}</span>
              </div>

              <h2 className="mt-4 font-display text-2xl font-black uppercase tracking-tight text-repixl-text-light sm:text-4xl lg:text-5xl">
                The Digicam Vault In Your Pocket
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-repixl-text-light/75 sm:text-base">
                Take the vintage digital camera marketplace everywhere. Browse authenticated CCD &amp; CMOS cameras,
                review real-time order delivery milestones, and get camera advice from the AI Concierge on Android.
              </p>

              {/* Action buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={MOBILE_APP_RELEASE.apiDownloadPath}
                  download={MOBILE_APP_RELEASE.apkFileName}
                  className="inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl bg-repixl-red px-6 py-3 font-display text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-repixl-red/30 transition-all hover:bg-red-700 active:scale-95"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
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
                  <span>Download APK ({MOBILE_APP_RELEASE.fileSizeFormatted})</span>
                </a>

                <Link
                  href="/download"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-repixl-muted/40 bg-repixl-charcoal/60 px-5 py-3 font-mono text-xs uppercase tracking-wider text-repixl-text-light transition-colors hover:border-repixl-text-light hover:bg-repixl-charcoal"
                >
                  <span>App Details &amp; Guide</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>

              {/* QR scan thumbnail for desktop */}
              <div className="mt-8 hidden items-center gap-4 rounded-xl border border-repixl-muted/20 bg-repixl-bg/50 p-3 sm:inline-flex">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white p-1">
                  <Image
                    src="/api/download/qr?target=apk&size=120"
                    alt="Scan QR code to download RePXL app"
                    width={64}
                    height={64}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="font-display text-xs font-bold uppercase tracking-wider text-repixl-text-light">
                    Scan with Phone
                  </p>
                  <p className="font-mono text-[11px] text-repixl-muted">
                    Instant APK download to your device
                  </p>
                </div>
              </div>
            </div>

            {/* Right Mockup */}
            <div className="flex justify-center lg:col-span-5">
              <div className="relative w-56 sm:w-64">
                {/* Glow */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-3 rounded-3xl bg-gradient-to-t from-repixl-red/30 to-amber-500/20 blur-xl opacity-75"
                />

                <div className="relative overflow-hidden rounded-[2rem] border-4 border-repixl-muted/40 bg-black shadow-2xl">
                  {/* Speaker pill */}
                  <div className="absolute top-2 left-1/2 z-20 h-3 w-16 -translate-x-1/2 rounded-full bg-neutral-900" />
                  
                  {/* Phone screen screenshot */}
                  <div className="relative aspect-[9/19.5] w-full overflow-hidden bg-neutral-950">
                    <Image
                      src="/images/mobile-app-preview.png"
                      alt="RePXL Mobile App Preview"
                      fill
                      className="object-cover object-top"
                      sizes="(min-width: 640px) 256px, 224px"
                    />
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                    Standalone Build • Pixel 10 Pro Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

