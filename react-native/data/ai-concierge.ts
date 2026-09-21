export const QUICK_PROMPTS = [
  'How does condition grading work?',
  'Where is my order?',
  'What is your return policy?',
  'Recommend a CCD camera',
  'What payment methods do you accept?',
];

export function generateAiResponse(input: string): string {
  const query = input.toLowerCase();

  if (/human|agent|representative|talk to|speak to/i.test(query)) {
    return 'I can connect you to our support team! Please switch to the "Contact Us" tab above to send a direct message, or email us at support@repxl.com. We respond to inquiries within 24 hours on business days.';
  }

  if (/pay|payment|gcash|card|cod|cash on delivery|maya/i.test(query)) {
    return 'We accept Visa, Mastercard, GCash, Maya, and Cash on Delivery (COD). All online payments are handled securely with encryption via PayMongo.';
  }

  if (/return|refund|warranty|exchange|money back/i.test(query)) {
    return 'We provide a 14-day return window from delivery if the item condition does not match the listing. Return shipping for condition mismatches is 100% free! Refunds are processed back to your original payment method within 5–7 business days.';
  }

  if (/grade|grading|condition|mint|fair|good|excellent/i.test(query)) {
    return 'Every camera at RePXL is graded into one of four tiers: Mint (flawless, museum condition with original box), Excellent (minimal cosmetic wear, battery & card included), Good (normal vintage patina, fully tested), or Fair (visible wear or minor quirks, body-only). All listings include multi-angle photos of the exact unit!';
  }

  if (/recommend|beginner|first camera|best|ccd/i.test(query)) {
    return 'For classic vintage digital photography, we love the Canon IXY Digital (rich cinematic skin tones), Kodak EasyShare (vivid retro saturated colors), and Sony Cyber-shot DSC-W series (great Carl Zeiss optics and punchy contrast). Check out our "Try the Look" color simulation on any camera detail screen to preview their CCD output!';
  }

  if (/sell|consignment|trade/i.test(query)) {
    return 'RePXL buys vintage digicams! Send us photos and details of your camera through the "Contact Us" tab here in the app. Our curation team will review the model and condition and extend an offer.';
  }

  if (/order|track|where is|shipping|deliver|courier/i.test(query)) {
    return 'You can track all active orders directly in your Purchases tab! Domestic shipments within Metro Manila take 3–5 business days, and provincial orders take 5–7 business days. You will also receive push notifications as your package moves from Confirmed to Shipped to Delivered.';
  }

  return 'Thank you for reaching out! RePXL is your curated home for vintage digital cameras. You can ask me about condition grading, tracking your order, return policies, CCD color profiles, or switch to the Contact tab to email our team directly!';
}

