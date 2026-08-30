export interface FAQItem {
  question: string
  answer: string
  category: 'Grading & Condition' | 'Orders, Payment & Shipping' | 'Returns & Refunds' | 'Selling With Us'
}

export const faqs: FAQItem[] = [
  {
    question: "How does your condition grading work?",
    category: 'Grading & Condition',
    answer:
      "Every camera that passes through RePXL is assessed against our standardized four-tier grading system: Mint, Excellent, Good, and Fair. Each grade evaluates cosmetic condition, functional performance, included accessories, and documented testing results. Our grading is performed by experienced collectors \u2014 not automated \u2014 and every assessment is documented with multi-angle photography so you can verify the grade yourself before purchasing.",
  },
  {
    question: "What\u2019s included when a camera ships?",
    category: 'Orders, Payment & Shipping',
    answer:
      "What ships with each camera depends on its condition grade and is clearly listed on every product page. Mint-grade cameras include original box, manual, strap, and cables where available. Excellent-grade cameras ship with a battery and memory card at minimum. Good-grade listings include a camera and battery, while Fair-grade listings include the camera body only unless otherwise noted. Every listing specifies exactly what you\u2019ll receive \u2014 no guessing.",
  },
  {
    question: "What is your return policy for condition mismatches?",
    category: 'Returns & Refunds',
    answer:
      "If the camera you receive doesn\u2019t match its listed condition grade, you\u2019re eligible for a full refund within 14 days of delivery. We cover return shipping for condition mismatches \u2014 you won\u2019t pay a cent. Just contact us with photos showing the discrepancy, and we\u2019ll issue a prepaid return label. Refunds are processed within 5\u20137 business days of receiving the returned item.",
  },
  {
    question: "How do you test batteries and memory cards?",
    category: 'Grading & Condition',
    answer:
      "Batteries are charge-cycled and tested for capacity before listing. We note the approximate charge retention in listings (e.g., \u201Cholds charge for a full day session\u201D or \u201Creduced capacity \u2014 charges to ~60%\u201D). Memory cards are formatted, write-tested, and verified for read/write integrity. If a battery or card shows degraded performance, it\u2019s documented honestly in the listing notes.",
  },
  {
    question: "How can I sell my cameras on RePXL?",
    category: 'Selling With Us',
    answer:
      "RePXL is a curated marketplace \u2014 we don\u2019t operate as an open peer-to-peer platform. If you have vintage digital cameras you\u2019d like to sell, contact us via our Contact page with details about the camera (model, condition, photos). Our team will assess whether it fits our catalog and make you an offer or discuss consignment options. We handle all grading, photography, and listing work.",
  },
  {
    question: "What payment methods do you accept?",
    category: 'Orders, Payment & Shipping',
    answer:
      "We accept Visa, Mastercard, GCash, and PayPal. All transactions are processed through secure, encrypted payment gateways. We never store your full card details on our servers. For high-value purchases, additional verification may be required for your protection.",
  },
  {
    question: "How long does shipping take?",
    category: 'Orders, Payment & Shipping',
    answer:
      "Standard domestic shipping takes 3\u20135 business days. Express shipping (1\u20132 business days) is available at checkout for an additional fee. All cameras are packaged with anti-static wrap, foam padding, and double-boxed for protection \u2014 vintage electronics are fragile, and we treat them accordingly. You\u2019ll receive tracking information via email as soon as your order ships.",
  },
  {
    question: "Do you guarantee sensor and lens condition?",
    category: 'Grading & Condition',
    answer:
      "Yes. Sensor cleanliness and lens clarity are core components of our grading process. Mint and Excellent grades guarantee a clean sensor and clear lens with no fungus, haze, or separation. Good-grade cameras may have minor sensor dust that doesn\u2019t appear in photos (documented in listing). Fair-grade cameras may have visible sensor or lens issues, which are always clearly described and photographed. If the actual condition doesn\u2019t match our description, our return policy applies.",
  },
  {
    question: "Do you ship internationally?",
    category: 'Orders, Payment & Shipping',
    answer:
      "International shipping is not available yet. We\u2019re currently focused on domestic orders to ensure we can maintain our packaging standards and offer reliable tracking. We\u2019re actively working on expanding to international markets \u2014 join our newsletter to be notified when international shipping becomes available.",
  },
  {
    question: "Can I inspect a camera before buying?",
    category: 'Grading & Condition',
    answer:
      "While we don\u2019t offer in-person inspection, every listing includes multi-angle photography under consistent lighting, a detailed condition assessment, and documented test results. Our 14-day return policy for condition mismatches means you\u2019re never stuck with a camera that doesn\u2019t match its description. If you have specific questions about a listing, reach out via our Contact page \u2014 we\u2019re happy to provide additional photos or details.",
  },
]

/** Curated subset for the Home page (most important questions for new visitors) */
export const homeFaqs: FAQItem[] = [
  faqs[0], // condition grading
  faqs[2], // return policy
  faqs[6], // shipping time
  faqs[1], // what's included
  faqs[7], // sensor/lens guarantee
]