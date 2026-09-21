import { BannerPlacement, PageStatus } from '@prisma/client'
import { termsContent, privacyContent } from '@/data/legal'
import { faqs } from '@/data/faqs'

export interface DefaultBannerSeed {
  title: string
  imageRef: string
  placement: BannerPlacement
  linkTarget: string
  isActive: boolean
}

export interface DefaultHomepageBlockSeed {
  type: string
  displayOrder: number
  isPublished: boolean
  content: Record<string, any>
}

export interface DefaultStaticPageSeed {
  slug: string
  title: string
  body: string
  status: PageStatus
}

export const DEFAULT_LANDING_BANNERS: DefaultBannerSeed[] = [
  {
    title: 'More than just a photo.',
    imageRef: '/images/camherosec.png',
    placement: BannerPlacement.HOMEPAGE_HERO,
    linkTarget: 'https://repxl.com/products',
    isActive: true,
  },
  {
    title: 'Hottest Deals',
    imageRef: '/images/dealbanner.png',
    placement: BannerPlacement.HOMEPAGE_STRIP,
    linkTarget: 'https://repxl.com/products',
    isActive: true,
  },
  {
    title: 'Sony Cyber-shot W800',
    imageRef: '/images/banner2.png',
    placement: BannerPlacement.SIDEBAR,
    linkTarget: 'https://repxl.com/products?brand=sony',
    isActive: true,
  },
]

export const DEFAULT_HOMEPAGE_BLOCKS: DefaultHomepageBlockSeed[] = [
  {
    type: 'editorial',
    displayOrder: 1,
    isPublished: true,
    content: {
      eyebrow: '— The digicam era',
      heading: 'Before filters, there was just light.',
      body: 'In the early 2000s, CCD sensors captured the world with an unapologetic warmth that modern smartphones cannot fake.',
      quoteAuthor: 'RePXL Editorial',
    },
  },
  {
    type: 'announcement',
    displayOrder: 2,
    isPublished: true,
    content: {
      title: 'Top Deals',
      badge: 'Up to 30% OFF',
      subtitle: 'Selected Brands',
      linkTarget: '/products',
      image: '/images/banner1.png',
    },
  },
]

const shippingReturnsBody = `## Shipping & Returns Policy

### 1. Domestic Shipping
- **Standard shipping:** 3–5 business days. Included free on orders over ₱5,000.
- **Express shipping:** 1–2 business days. Available at checkout for an additional fee.
- Tracking information is emailed to you as soon as your order is dispatched. All shipments require a signature on delivery.

### 2. Packaging Standards
Vintage electronics are fragile — we package accordingly. Every camera ships with:
- Anti-static wrap around the camera body
- Foam padding on all sides
- Double-boxed for impact protection
- Silica gel packets to prevent moisture damage
- Accessories individually wrapped and secured
We take the same care shipping a ₱2,000 point-and-shoot as we do a ₱15,000 collector piece.

### 3. Return Window
You have **14 days** from the date of delivery to initiate a return. The camera must be in the same condition as received, with all included accessories.

### 4. Condition Mismatch Returns
If the camera you receive doesn't match its listed condition grade, you are eligible for a **full refund**. This is our commitment to transparent grading.
- Contact us within 14 days with photos showing the discrepancy. We'll review, issue a prepaid return label, and process your refund once the camera is received.
- **RePXL covers return shipping** for all condition-mismatch returns. You won't pay a cent.

### 5. Change-of-Mind Returns
Changed your mind? No problem — returns are accepted within the 14-day window as long as the camera is in unchanged condition.
- For change-of-mind returns, the **buyer covers return shipping costs**. A restocking fee does not apply.

### 6. Refund Processing
Refunds are processed within **5–7 business days** of receiving the returned item. The refund is issued to your original payment method.
- You'll receive email confirmation when your refund is initiated and completed. Allow an additional 1–3 days for your bank or payment provider to reflect the credit.

### 7. International Shipping
International shipping is **not available yet**. We're focused on maintaining our packaging and delivery standards domestically before expanding internationally.`

const conditionGradingBody = `## Condition Grading Standards

Every camera on RePXL is assessed against our standardized four-tier grading system: Mint, Excellent, Good, and Fair. Every assessment is documented with multi-angle photography and verified serial numbers.

### Mint Grade
- **Cosmetic:** No visible wear, scratches, or marks. Looks brand new. Body panels are immaculate, LCD screen is flawless, and all labeling/text is crisp and unscuffed.
- **Functional:** All features work perfectly. Sensor clean, lens clear with no fungus or haze, flash fires consistently, zoom operates smoothly, all buttons and dials respond correctly.
- **Accessories:** Comes with original box, manual, strap, and cables where available. Packaging may show minor shelf wear but is complete.
- **Testing:** 50+ test shots taken across all modes. Battery holds a full charge cycle. Memory card write/read verified.

### Excellent Grade
- **Cosmetic:** Minimal signs of use — light handling marks only visible under direct light. No scratches visible at arm's length. LCD and lens surfaces are clean and clear.
- **Functional:** All features work correctly. Sensor clean, minor dust particles may be present but are non-visible in photos at any aperture. All mechanical operations smooth.
- **Accessories:** May not include original box. Camera, battery, and memory card included. Strap or cables included when available.
- **Testing:** Full function test across all shooting modes. Battery holds charge for normal use session (100+ shots).

### Good Grade
- **Cosmetic:** Visible signs of regular use — light scratches on body, minor paint wear on edges and corners. LCD may have light surface marks but is fully functional. Shows its history without being damaged.
- **Functional:** All core features work. May have minor quirks noted in listing (e.g., slightly sticky zoom ring, slow focus in low light, minor viewfinder dust). These are always documented honestly.
- **Accessories:** Camera and battery included. Memory card may not be included.
- **Testing:** Core functions tested across primary shooting modes. Quirks documented honestly with examples.

### Fair Grade
- **Cosmetic:** Noticeable wear — scratches, scuffs, paint loss on edges and grip areas. Shows its age clearly. LCD may have minor blemishes. Body is structurally sound but visibly used.
- **Functional:** Works but with documented limitations (e.g., flash intermittent, LCD has dead pixels, battery holds reduced charge). All limitations are clearly described in the listing.
- **Accessories:** Camera body only unless otherwise noted. Battery included if required for basic operation.
- **Testing:** Tested to confirm basic operation and document all limitations clearly.

### 14-Day Condition Guarantee
If a camera you receive doesn't match its listed condition grade, you're eligible for a full refund within 14 days. RePXL covers return shipping for condition mismatches.`

const aboutBody = `## About RePXL

By collectors, for collectors. The story behind RePXL — and why we grade every camera before it reaches you.

### Built From Frustration
RePXL started with a frustration every collector knows too well: scrolling through secondhand marketplaces, squinting at blurry photos, and wondering if the "Mint condition" seller actually knows what mint condition means.

Vintage digital cameras — the early-2000s CCDs, the pocket-sized CyberShots, the PowerShots that shaped a generation of casual photography — deserve better than a guessing game.

So we built a marketplace where every camera is inspected, graded, and photographed before it's ever listed, and where the story of this specific unit — its serial number, its wear, its history — is never hidden behind a stock photo.

### How We Grade
- **01 Sourcing:** We track down units from estate sales, camera shops, and fellow collectors — every camera is inspected in person before it enters our pipeline.
- **02 Inspection & Grading:** Every function is tested, every mark documented. Each unit is graded against our four-tier standard — Mint, Excellent, Good, or Fair — the same way, every time.
- **03 Photography:** Multi-angle shots under consistent lighting, no filters or touch-ups. What you see on the listing is exactly what ships.
- **04 Packing & Shipping:** Anti-static wrap, foam padding, double-boxed. Vintage electronics are fragile — we treat every shipment accordingly.

### What We Believe
- **Standardized grading:** Every camera is assessed against the same four-tier standard consistently and transparently.
- **Serial verification:** Every unit is serial-number verified and documented. You know exactly which camera you're buying.
- **Multi-angle photography:** Consistent lighting, multiple angles. What you see on the listing is what arrives at your door.
- **Transparent condition notes:** Wear, marks, quirks — described honestly in every listing.

### A Small, Collector-Run Team
No call centers, no outsourced warehouses — just a handful of people who care about vintage cameras as much as you do:
- **Grading & Curation:** Personally tested and graded before listing.
- **Photography & QA:** Consistent lighting, honest angles, zero touch-ups.
- **Customer Care & Fulfillment:** Small dedicated team from packing to post-sale support.`

const faqBody = `## Frequently Asked Questions

${faqs
  .map(
    (f) => `### ${f.question}
**Category: ${f.category}**

${f.answer}`
  )
  .join('\n\n')}`

const contactBody = `## Contact & Support

Questions about an order, condition grade, or selling your cameras? We're here to help.

### Ways to Reach Us
- **Email:** support@repxl.com
- **Response Time:** Within 24 hours on business days
- **Condition Disputes:** Prioritized — we respond same-day with dedicated resolution
- **Support Hours:** Monday to Friday, 9:00 AM – 6:00 PM PHT

### Inquiry Topics
- **General Inquiry:** Questions about our catalog, camera models, and availability.
- **Order Issue:** Inquiries regarding active shipments, order modifications, or tracking updates.
- **Condition Concern:** Direct escalation if a received unit differs from its listed condition grade.
- **Selling a Camera:** Submitting vintage digital camera equipment for catalog review or appraisal.`

export const DEFAULT_STATIC_PAGES: DefaultStaticPageSeed[] = [
  {
    slug: 'terms',
    title: 'Terms of Service',
    body: termsContent,
    status: PageStatus.PUBLISHED,
  },
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    body: privacyContent,
    status: PageStatus.PUBLISHED,
  },
  {
    slug: 'shipping-returns',
    title: 'Shipping & Returns',
    body: shippingReturnsBody,
    status: PageStatus.PUBLISHED,
  },
  {
    slug: 'condition-grading',
    title: 'Condition Grading Standards',
    body: conditionGradingBody,
    status: PageStatus.PUBLISHED,
  },
  {
    slug: 'about',
    title: 'About RePXL',
    body: aboutBody,
    status: PageStatus.PUBLISHED,
  },
  {
    slug: 'faq',
    title: 'Frequently Asked Questions',
    body: faqBody,
    status: PageStatus.PUBLISHED,
  },
  {
    slug: 'contact',
    title: 'Contact & Support',
    body: contactBody,
    status: PageStatus.PUBLISHED,
  },
]

export const DEFAULT_SHIPPING_RETURNS_BODY = shippingReturnsBody
export const DEFAULT_CONDITION_GRADING_BODY = conditionGradingBody
export const DEFAULT_ABOUT_BODY = aboutBody
export const DEFAULT_FAQ_BODY = faqBody
export const DEFAULT_CONTACT_BODY = contactBody

