import { Container } from '@/components/layout/Container'
import { privacyContent } from '@/data/legal'
import { LegalPageContent } from '../terms/LegalPageContent'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pb-16 pt-24">
      <Container>
        <div className="mx-auto max-w-2xl">
          <LegalPageContent content={privacyContent} />
        </div>
      </Container>
    </div>
  )
}
