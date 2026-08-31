import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { termsContent } from '@/data/legal'
import { LegalPageContent } from './LegalPageContent'

export default function TermsPage() {
  return (
    <>
      <div className="min-h-screen pb-16 pt-24">
        <Container>
          <div className="mx-auto max-w-2xl">
            <LegalPageContent content={termsContent} />
          </div>
        </Container>
      </div>
      <Footer />
    </>
  )
}
