import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ConditionalNavbar } from '@/components/layout/ConditionalNavbar'
import { ConditionalChatWidget } from '@/components/chat/ConditionalChatWidget'
import { GlobalToast } from '@/components/ui/GlobalToast'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { NavigationHistoryProvider } from '@/hooks/useNavigationHistory'
import './globals.css'

// ─── Fonts ───────────────────────────────────────────────────────────────────
// Body (Inter) and mono (JetBrains Mono) are self-hosted by Next.js via
// next/font/google — Next downloads them at build time and serves them from our
// own origin (no runtime fonts.googleapis.com / fonts.gstatic.com request), with
// automatic size-adjusted fallbacks to minimize layout shift.
//
// Display (General Sans) is NOT on Google Fonts — it's published on Fontshare
// (ITF). It is loaded at runtime from the Fontshare CDN via the <link> below.
// We `preconnect` to the Fontshare origins so the connection is warmed early,
// keep `display=swap` (text renders immediately in the fallback, never blank),
// and give --font-general-sans a size-similar system fallback so headings stay
// readable and layout stays stable even if Fontshare is slow/unreachable.
// (Self-hosting General Sans via next/font/local would require committing its
// font files to public/fonts/, which are not present in the repo.)
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'RePXL — Vintage Digital Cameras',
  description:
    'The curated marketplace for vintage digital cameras. Condition-graded, serial-verified, and trusted by collectors.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetbrainsMono.variable} relative`}
    >
      <head>
        {/* Warm the Fontshare connection before requesting the stylesheet/fonts. */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        {/* Display font: General Sans (Fontshare). display=swap avoids invisible text. */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@200,300,400,500,600,700&display=swap"
        />
        {/*
          --font-general-sans carries a size-similar system fallback stack, so
          headings render immediately (and remain readable with minimal layout
          shift) while General Sans loads — or if the Fontshare CDN is
          unreachable. General Sans is the first choice; the rest are fallbacks.
        */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              `:root { --font-general-sans: 'General Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }`,
          }}
        />
      </head>
      <body className="font-body">
        <AuthProvider>
          <NavigationHistoryProvider>
            <ConditionalNavbar />
            <GlobalToast />
            {children}
            <ConditionalChatWidget />
          </NavigationHistoryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
