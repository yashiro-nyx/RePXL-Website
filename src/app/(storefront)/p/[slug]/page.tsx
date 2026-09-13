import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Container } from '@/components/layout/Container'
import { isPageVisibleTo } from '@/lib/cms'
import { getCurrentAdmin } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function StaticPageView({ params }: Props) {
  const { slug } = await params
  const page = await prisma.staticPage.findUnique({
    where: { slug: slug.toLowerCase() },
  })

  if (!page) {
    notFound()
  }

  const admin = await getCurrentAdmin()
  const isVisible = isPageVisibleTo(page.status, !!admin)

  if (!isVisible) {
    notFound()
  }

  return (
    <main className="py-16 md:py-24">
      <Container className="max-w-3xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-repixl-muted hover:text-repixl-text-light transition-colors"
          >
            ← Back to Home
          </Link>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-repixl-text-light md:text-5xl">
            {page.title}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <span className="font-mono text-xs text-repixl-muted">
              Last updated: {new Date(page.updatedAt).toLocaleDateString()}
            </span>
            {page.status === 'DRAFT' && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-400">
                Draft Preview (Admin)
              </span>
            )}
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-repixl-text-light/85 leading-relaxed">
          <div className="whitespace-pre-wrap font-sans text-base">
            {page.body}
          </div>
        </div>
      </Container>
    </main>
  )
}

