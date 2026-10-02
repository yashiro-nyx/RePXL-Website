import { describe, it, expect } from 'vitest'
import {
  generateAiResponse,
  webActionHref,
  QUICK_PROMPTS,
  PROMPT_CATEGORIES,
  FALLBACK_REPLY,
  type AiAction,
} from './ai-concierge'
// The mobile source is the origin of this logic — we import it directly to
// enforce that the web copy stays a faithful port (parity guard).
import {
  generateAiResponse as mobileGenerate,
  QUICK_PROMPTS as MOBILE_QUICK_PROMPTS,
} from '../../react-native/data/ai-concierge'

const SAMPLE_QUERIES = [
  'hello',
  'thanks',
  'who are you?',
  'can I speak to a human agent?',
  'why are CCD sensors better?',
  'best camera for a Y2K flash party',
  'warm nostalgic kodak colors',
  'best camera for beginners',
  'budget camera under 3500',
  'slim metal pocket camera',
  'canon vs sony',
  'recommend a camera',
  'battery and charger info',
  'what memory card size should I use?',
  'how to transfer photos to phone',
  'can it shoot video?',
  'my photos are blurry and dark',
  'how to clean and store my camera',
  'what is try the look?',
  'compare tool',
  'how does condition grading work?',
  'what is included in the box?',
  'fungus and haze inspection',
  'does LCD yellowing affect photos?',
  'are cameras authentic?',
  'how long does shipping take?',
  'same day rush delivery',
  'international shipping?',
  'where is my order?',
  'cancel my order',
  'what payment methods (gcash, cod)?',
  'do you have a promo voucher code?',
  'what is your refund and return policy?',
  'my camera was damaged in transit',
  'how can I sell or trade my camera?',
  'what is the meaning of life in vintage photography?', // fallback
]

describe('AI concierge standard unknown-information fallback', () => {
  it.each([
    '', '   ', 'asdfghjkl', '???', 'Tell me a joke', 'What is the weather today?',
    'How long does pasta take to cook?', 'Where is the moon?', 'Write Python code',
    'Recommend a restaurant', 'Plan a budget vacation', 'What is a good recipe?',
    'Explain power generation', 'Tell me about a warm soup', 'Compare two laptops',
    'Hello, what is the weather?', 'What is the capital of Australia?',
    'What is the RePXL founder birthday?', 'What is the current price of a Canon IXY 930?',
    'Does RePXL accept cryptocurrency?', 'Does my camera support quantum teleportation?',
    'Write Python code for my camera', 'Hello RePXL, can my camera teleport?',
    'What are you wearing?',
  ])('uses the same honest fallback on both platforms for %j', (query) => {
    const response = generateAiResponse(query)
    expect(response.text).toBe(FALLBACK_REPLY)
    expect(response.action).toEqual({ type: 'contact', label: 'Contact Support' })
    expect(response.suggestedFollowUps?.length).toBeGreaterThan(0)
    expect(mobileGenerate(query)).toEqual(response)
  })
  it('keeps every built-in suggested topic answerable on both platforms', () => {
    for (const prompt of PROMPT_CATEGORIES.flatMap((category) => category.prompts)) {
      const response = generateAiResponse(prompt)
      expect(response.text, prompt).not.toBe(FALLBACK_REPLY)
      expect(mobileGenerate(prompt)).toEqual(response)
    }
  })
  it.each(['hello', 'thanks', 'Contact human team', 'where is my order?', 'What payment methods do you accept?', 'What is your return policy?', 'How to transfer photos to phone?'])('preserves supported response for %j', (query) => {
    expect(generateAiResponse(query).text).not.toBe(FALLBACK_REPLY)
  })
})

describe('AI concierge — parity with the mobile source', () => {
  it('exposes the same quick prompts as mobile', () => {
    expect(QUICK_PROMPTS).toEqual(MOBILE_QUICK_PROMPTS)
  })

  it('produces identical text/action/follow-ups for a broad query set', () => {
    for (const q of SAMPLE_QUERIES) {
      const web = generateAiResponse(q)
      const mobile = mobileGenerate(q)
      expect(web.text, `text mismatch for "${q}"`).toBe(mobile.text)
      expect(web.action?.type, `action mismatch for "${q}"`).toBe(mobile.action?.type)
      expect(web.suggestedFollowUps, `follow-ups mismatch for "${q}"`).toEqual(mobile.suggestedFollowUps)
    }
  })

  it('has matching prompt categories', () => {
    expect(PROMPT_CATEGORIES.length).toBeGreaterThan(0)
    expect(PROMPT_CATEGORIES[0].id).toBe('popular')
  })
})

describe('AI concierge — content expectations', () => {
  it('greets and identifies as an automated assistant path exists', () => {
    const r = generateAiResponse('hello')
    expect(r.text).toContain('AI Concierge')
    expect(r.action?.type).toBe('browse')
  })

  it('routes human-agent requests to Contact + email (no fake human presence)', () => {
    const r = generateAiResponse('I want to talk to a real person')
    expect(r.text).toContain('support@repxl.com')
    expect(r.action?.type).toBe('contact')
  })

  it('answers order questions with guidance (never fabricated order data)', () => {
    const r = generateAiResponse('where is my order?')
    expect(r.action?.type).toBe('orders')
    // It gives instructions, not a specific fabricated status/tracking number.
    expect(r.text.toLowerCase()).toContain('orders')
  })

  it('always returns a non-empty reply with an action', () => {
    for (const q of SAMPLE_QUERIES) {
      const r = generateAiResponse(q)
      expect(r.text.trim().length).toBeGreaterThan(0)
      expect(r.action).toBeDefined()
    }
  })
})

describe('webActionHref — action → storefront route', () => {
  it('maps each action type to a valid internal route', () => {
    expect(webActionHref({ type: 'orders', label: '' })).toBe('/account/orders')
    expect(webActionHref({ type: 'browse', label: '' })).toBe('/products')
    expect(webActionHref({ type: 'faq', label: '' })).toBe('/faq')
    expect(webActionHref({ type: 'contact', label: '' })).toBe('/contact')
    expect(webActionHref({ type: 'compare', label: '' })).toBe('/compare')
  })

  it('returns null for undefined action', () => {
    expect(webActionHref(undefined)).toBeNull()
  })

  it('every generated action maps to a real route for the sample set', () => {
    for (const q of SAMPLE_QUERIES) {
      const r = generateAiResponse(q)
      const href = webActionHref(r.action as AiAction)
      expect(href, `no route for action on "${q}"`).toBeTruthy()
      expect(href!.startsWith('/')).toBe(true)
    }
  })
})
