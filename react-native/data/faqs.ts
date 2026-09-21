export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'Grading & Condition' | 'Orders, Payment & Shipping' | 'Returns & Refunds' | 'Selling With Us';
}

export const FAQ_CATEGORIES = [
  'All',
  'Grading & Condition',
  'Orders, Payment & Shipping',
  'Returns & Refunds',
  'Selling With Us',
] as const;

export const FAQS: FAQItem[] = [
  {
    id: '1',
    question: 'How does your condition grading work?',
    category: 'Grading & Condition',
    answer:
      'Every camera that passes through RePXL is assessed against our standardized four-tier grading system: Mint, Excellent, Good, and Fair. Each grade evaluates cosmetic condition, functional performance, included accessories, and documented testing results. Our grading is performed by experienced collectors — not automated — and every assessment is documented with multi-angle photography.',
  },
  {
    id: '2',
    question: 'What is included when a camera ships?',
    category: 'Orders, Payment & Shipping',
    answer:
      'What ships with each camera depends on its condition grade and is clearly listed on every product page. Mint-grade cameras include original box, manual, strap, and cables where available. Excellent-grade cameras ship with a battery and memory card at minimum. Good-grade listings include camera and battery, while Fair-grade listings include camera body only unless otherwise noted.',
  },
  {
    id: '3',
    question: 'What is your return policy for condition mismatches?',
    category: 'Returns & Refunds',
    answer:
      "If the camera you receive doesn't match its listed condition grade, you're eligible for a full refund within 14 days of delivery. We cover return shipping for condition mismatches — you won't pay a cent. Just submit a return request through your order history with photos showing the discrepancy.",
  },
  {
    id: '4',
    question: 'How do you test batteries and memory cards?',
    category: 'Grading & Condition',
    answer:
      'Batteries are charge-cycled and tested for capacity before listing. We note the approximate charge retention in listings (e.g., "holds charge for full day session" or "charges to ~60%"). Memory cards are formatted, write-tested, and verified for read/write integrity.',
  },
  {
    id: '5',
    question: 'How can I sell my vintage cameras on RePXL?',
    category: 'Selling With Us',
    answer:
      'RePXL is a curated marketplace — we do not operate as an unverified open peer-to-peer platform. If you have vintage digital cameras you would like to sell, contact us through our Contact Support form with camera model, condition, and photos. Our team will assess whether it fits our catalog and make you an offer.',
  },
  {
    id: '6',
    question: 'What payment methods do you accept?',
    category: 'Orders, Payment & Shipping',
    answer:
      'We accept Visa, Mastercard, GCash, Maya, and Cash on Delivery (COD). All online payments are securely processed with end-to-end encryption via PayMongo. We never store raw card details.',
  },
  {
    id: '7',
    question: 'How long does delivery take in the Philippines?',
    category: 'Orders, Payment & Shipping',
    answer:
      'Standard domestic shipping takes 3–5 business days within Metro Manila and 5–7 business days for provincial addresses. All cameras are packed with anti-static wrap, bubble padding, and double-boxed. You can track your shipment step-by-step in the Orders tab.',
  },
  {
    id: '8',
    question: 'Do you guarantee sensor and lens condition?',
    category: 'Grading & Condition',
    answer:
      'Yes! Sensor cleanliness and lens clarity are core parts of our verification. Mint and Excellent grades guarantee a spotless sensor and clear lens with no fungus, haze, or separation. Any minor imperfections on Good or Fair cameras are highlighted explicitly.',
  },
  {
    id: '9',
    question: 'What is special about CCD sensor cameras?',
    category: 'Grading & Condition',
    answer:
      'Cameras made between 2000 and 2010 typically use CCD sensors rather than modern CMOS sensors. CCD sensors produce distinct, nostalgic color science with rich reds, vivid blues, and natural film-like skin tones straight out of camera without needing filters.',
  },
];

