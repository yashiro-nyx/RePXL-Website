import { Hero } from '@/components/landing/Hero'
import { TrustStrip } from '@/components/landing/TrustStrip'
import { EditorialSection } from '@/components/landing/EditorialSection'
import { BrandGallery } from '@/components/landing/BrandGallery'
import { FeaturedCarousel } from '@/components/landing/FeaturedCarousel'
import { ConditionExplainer } from '@/components/landing/ConditionExplainer'
import { Testimonials } from '@/components/landing/Testimonials'
import { NewsletterCTA } from '@/components/landing/NewsletterCTA'
import { Footer } from '@/components/layout/Footer'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <TrustStrip />
      <EditorialSection />
      <BrandGallery />
      <FeaturedCarousel />
      <ConditionExplainer />
      <Testimonials />
      <NewsletterCTA />
      <Footer />
    </main>
  )
}
