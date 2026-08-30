import { Hero } from '@/components/landing/Hero'
import { TrustStrip } from '@/components/landing/TrustStrip'
import { EditorialSection } from '@/components/landing/EditorialSection'
import { BrandGallery } from '@/components/landing/BrandGallery'
import { PromoDuo } from '@/components/landing/PromoDuo'
import { BestSellers } from '@/components/landing/BestSellers'
import { WhyUs } from '@/components/landing/WhyUs'
import { DealBanner } from '@/components/landing/DealBanner'
import { FeaturedCarousel } from '@/components/landing/FeaturedCarousel'
import { ConditionExplainer } from '@/components/landing/ConditionExplainer'
import { Testimonials } from '@/components/landing/Testimonials'
import { HomeFAQ } from '@/components/landing/HomeFAQ'
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
     <PromoDuo />
     <BestSellers />
     <WhyUs />
     <DealBanner />
     <ConditionExplainer />
     <Testimonials />
     <HomeFAQ />
     <NewsletterCTA />
     <Footer />
   </main>
 )
}



