import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { termsContent } from '@/data/legal'
import { prisma } from '@/lib/prisma'
import { LegalPageContent } from './LegalPageContent'

export const dynamic = 'force-dynamic'

export default async function TermsPage() {
  let content = termsContent

  try {
    const page = await prisma.staticPage.findUnique({
      where: { slug: 'terms' },
    })
    if (page && page.status === 'PUBLISHED' && page.body.trim()) {
      content = page.body
    }
  } catch (err) {
    console.error('Failed to load terms page from database:', err)
  }

  return (
    <>
      <div className="min-h-screen pb-16 pt-24">
        <Container>
          <div className="mx-auto max-w-2xl">
            <LegalPageContent content={content} />
          </div>
        </Container>
      </div>
      <Footer />
    </>
  )
}
