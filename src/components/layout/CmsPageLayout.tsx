'use client'

import React from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { LegalPageContent } from '@/app/(storefront)/terms/LegalPageContent'

interface CmsPageLayoutProps {
  title: string
  body: string
  updatedAt?: string | Date | null
  isDraft?: boolean
  backHref?: string
  backLabel?: string
  children?: React.ReactNode
}

export function CmsPageLayout({
  title,
  body,
  updatedAt,
  isDraft,
  backHref = '/',
  backLabel = 'Back to Home',
  children,
}: CmsPageLayoutProps) {
  return (
    <>
      <main className="min-h-[70vh] py-16 md:py-24">
        <Container className="max-w-3xl">
          <div className="mb-8">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light"
            >
              ← {backLabel}
            </Link>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-repixl-text-light md:text-5xl">
              {title}
            </h1>
            <div className="mt-3 flex items-center gap-3">
              {updatedAt && (
                <span className="font-mono text-xs text-repixl-muted">
                  Last updated: {new Date(updatedAt).toLocaleDateString()}
                </span>
              )}
              {isDraft && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-400">
                  Draft Preview (Admin)
                </span>
              )}
            </div>
          </div>

          <div className="prose-repixl max-w-none">
            <LegalPageContent content={body} />
          </div>

          {children && <div className="mt-12">{children}</div>}
        </Container>
      </main>
      <Footer />
    </>
  )
}

