import { Container } from '@/components/layout/Container'
import { termsContent } from '@/data/legal'
import { LegalPageContent } from './LegalPageContent'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-repixl-bg pb-16 pt-24">
      <Container>
        <div className="mx-auto max-w-2xl">
          <LegalPageContent content={termsContent} />
        </div>
      </Container>
    </div>
  )
}
