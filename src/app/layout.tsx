import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ConditionalNavbar } from '@/components/layout/ConditionalNavbar'
import { GlobalToast } from '@/components/ui/GlobalToast'
import { AuthProvider } from '@/components/auth/AuthProvider'
import './globals.css'

// General Sans via Fontshare CDN — loaded as a local font from the CDN URL
// next/font/local requires actual file paths, so we load General Sans
// via a <link> in metadata and use CSS variable fallback.
// For production, download the font files to public/fonts/ and reference them here.
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
  title: 'RePIXL — Vintage Digital Cameras',
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
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* General Sans from Fontshare CDN */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@200,300,400,500,600,700&display=swap"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { --font-general-sans: 'General Sans', sans-serif; }`,
          }}
        />
      </head>
      <body className="font-body">
        <AuthProvider>
          <ConditionalNavbar />
          <GlobalToast />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
