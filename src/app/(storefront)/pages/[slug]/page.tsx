import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { CornerBracket } from '@/components/ui'

interface StaticPage {
  id: string
  title: string
  slug: string
  content: string
  status: string
  updatedAt: string
}

async function fetchPage(slug: string): Promise<StaticPage | null> {
  try {
    // Server-side fetch using the absolute base URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/admin/cms/pages?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const body = await res.json()
    // Find the matching published page
    const pages: StaticPage[] = body.data ?? []
    return pages.find((p) => p.slug === slug && p.status === 'published') ?? null
  } catch {
    return null
  }
}

export default async function CmsStaticPage({ params }: { params: { slug: string } }) {
  const page = await fetchPage(params.slug)

  // Draft pages: serve not-found to non-admin visitors
  if (!page) {
    notFound()
  }

  return (
    <>
      <div className="burn-subtle min-h-screen pb-20 pt-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                <li><Link href="/" className="transition-colors hover:text-repixl-text-light">Home</Link></li>
                <li aria-hidden="true" className="text-repixl-muted/40">/</li>
                <li className="text-repixl-text-light/50">{page.title}</li>
              </ol>
            </nav>

            {/* Page header with corner-bracket framing */}
            <CornerBracket
              size={12}
              color="rgba(140, 133, 128, 0.2)"
              className="mb-10 inline-block"
            >
              <div className="px-4 py-2">
                <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">— Content Page</span>
                <h1 className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg">
                  {page.title}
                </h1>
                <p className="mt-1 font-mono text-[10px] text-repixl-muted/60">
                  Last updated {new Date(page.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </CornerBracket>

            {/* Content */}
            <article
              className="prose prose-invert prose-sm max-w-none text-repixl-text-light/80 prose-headings:font-display prose-headings:text-repixl-text-light prose-a:text-repixl-red prose-a:no-underline hover:prose-a:underline prose-strong:text-repixl-text-light prose-hr:border-repixl-muted/20"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>
        </Container>
      </div>
      <Footer />
    </>
  )
}

export const dynamic = 'force-dynamic'
