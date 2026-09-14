/**
 * Notification template logic (pure).
 *
 * Implements the token registry, placeholder resolution, unknown-token
 * detection, and template field validation described in the
 * admin-client-management-suite design (Components & Interfaces §5).
 *
 * This module contains only pure functions so it can be property-tested
 * independently of I/O. It does not import Prisma or any external service.
 */

/**
 * Notification event identifiers. These are kept string-literal aligned with
 * the `NotificationEvent` enum in the Prisma schema
 * (@prisma/client) so template code and persistence agree on the same set.
 */
export type NotificationEvent =
  | 'ORDER_CONFIRMATION'
  | 'ORDER_STATUS_CHANGE'
  | 'RETURN_RECEIVED'
  | 'RETURN_STATUS_CHANGE'
  | 'REFUND_COMPLETED'
  | 'PROMOTION'
  | 'REPIXL_UPDATE'

/** All notification events, in schema order. */
export const NOTIFICATION_EVENTS: readonly NotificationEvent[] = [
  'ORDER_CONFIRMATION',
  'ORDER_STATUS_CHANGE',
  'RETURN_RECEIVED',
  'RETURN_STATUS_CHANGE',
  'REFUND_COMPLETED',
  'PROMOTION',
  'REPIXL_UPDATE',
] as const

/**
 * Notification category groupings used by the UI.
 * ORDER_UPDATES covers all order lifecycle + return/refund events.
 * PROMOTIONS covers marketing/discount events.
 * REPIXL_UPDATES covers platform announcements.
 */
export type NotificationCategory = 'ORDER_UPDATES' | 'PROMOTIONS' | 'REPIXL_UPDATES'

export const EVENT_CATEGORY_MAP: Record<NotificationEvent, NotificationCategory> = {
  ORDER_CONFIRMATION:  'ORDER_UPDATES',
  ORDER_STATUS_CHANGE: 'ORDER_UPDATES',
  RETURN_RECEIVED:     'ORDER_UPDATES',
  RETURN_STATUS_CHANGE:'ORDER_UPDATES',
  REFUND_COMPLETED:    'ORDER_UPDATES',
  PROMOTION:           'PROMOTIONS',
  REPIXL_UPDATE:       'REPIXL_UPDATES',
}

/**
 * Placeholder tokens allowed per event. Tokens are referenced in template
 * bodies/subjects using the `{{token}}` syntax (see {@link TOKEN_PATTERN}).
 * Any token used in a body that is not listed here for its event is treated
 * as unknown (Req 8.5).
 */
export const ALLOWED_TOKENS: Record<NotificationEvent, string[]> = {
  ORDER_CONFIRMATION:   ['orderNumber', 'customerName', 'orderTotal', 'orderDate'],
  ORDER_STATUS_CHANGE:  ['orderNumber', 'customerName', 'status', 'orderStatus', 'courierName', 'courierEstimate', 'trackingNumber'],
  RETURN_RECEIVED:      ['orderNumber', 'customerName', 'returnId', 'returnRequestId'],
  RETURN_STATUS_CHANGE: ['orderNumber', 'customerName', 'returnId', 'returnRequestId', 'status', 'returnStatus'],
  REFUND_COMPLETED:     ['orderNumber', 'customerName', 'refundAmount', 'orderTotal'],
  PROMOTION:            ['customerName', 'promoTitle', 'promotionTitle', 'promoCode', 'promotionCode', 'promoBody', 'promotionBody'],
  REPIXL_UPDATE:        ['customerName', 'updateTitle', 'updateBody'],
}

/**
 * Common token aliases to allow seamless fallback when a template uses an alias.
 */
const TOKEN_ALIASES: Record<string, string[]> = {
  orderStatus: ['status'],
  status: ['orderStatus', 'returnStatus'],
  returnRequestId: ['returnId'],
  returnId: ['returnRequestId'],
  returnStatus: ['status'],
  promotionTitle: ['promoTitle'],
  promoTitle: ['promotionTitle'],
  promotionCode: ['promoCode'],
  promoCode: ['promotionCode'],
  promotionBody: ['promoBody', 'updateBody'],
  promoBody: ['promotionBody'],
  orderTotal: ['refundAmount'],
}

/**
 * Matches a placeholder token of the form `{{ tokenName }}`.
 * Token names are limited to letters, digits and underscore. Surrounding
 * whitespace inside the braces is tolerated and trimmed.
 */
const TOKEN_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g

/** Extract the ordered list of token names referenced in a string. */
function extractTokens(text: string): string[] {
  const tokens: string[] = []
  const regex = new RegExp(TOKEN_PATTERN)
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[1])
  }

  return tokens
}

/**
 * Replace each `{{token}}` occurrence in `body` with its value from `context`.
 *
 * Only tokens present as keys in `context` (or mapped via aliases) are replaced;
 * unrecognized tokens are left untouched so callers can detect them via {@link findUnknownTokens}.
 *
 * Req 8.4: defined placeholder tokens are replaced with the corresponding
 * order/customer value when composing a notification.
 */
export function resolvePlaceholders(
  body: string,
  context: Record<string, string>
): string {
  return body.replace(TOKEN_PATTERN, (whole, tokenName: string) => {
    if (Object.prototype.hasOwnProperty.call(context, tokenName)) {
      return context[tokenName]
    }
    const aliases = TOKEN_ALIASES[tokenName]
    if (aliases) {
      for (const alias of aliases) {
        if (Object.prototype.hasOwnProperty.call(context, alias)) {
          return context[alias]
        }
      }
    }
    return whole
  })
}

/**
 * Return the set of tokens used in `body` that are not defined for `event`.
 *
 * The result is de-duplicated and preserves first-seen order. An empty array
 * means every token used is valid for the event.
 *
 * Req 8.5: unknown tokens must be detected so the save can be rejected.
 */
export function findUnknownTokens(
  body: string,
  event: NotificationEvent
): string[] {
  const allowed = new Set(ALLOWED_TOKENS[event] ?? [])
  const unknown: string[] = []
  const seen = new Set<string>()
  for (const token of extractTokens(body)) {
    if (!allowed.has(token) && !seen.has(token)) {
      seen.add(token)
      unknown.push(token)
    }
  }
  return unknown
}

/** Field-length bounds for template validation (Req 8.2, 8.3). */
export const TEMPLATE_LIMITS = {
  subjectMin: 1,
  subjectMax: 200,
  bodyMin: 1,
  bodyMax: 10000,
} as const

export interface TemplateInput {
  subject: string
  body: string
}

export interface TemplateValidationError {
  field: 'subject' | 'body'
  message: string
}

export interface TemplateValidationResult {
  valid: boolean
  errors: TemplateValidationError[]
}

/**
 * Validate a notification template's editable fields.
 *
 * Req 8.2: accept when subject is 1–200 chars and body is 1–10,000 chars.
 * Req 8.3: otherwise reject and report each invalid field with its allowed
 * length. Length is measured on the raw string (bounds are 1..max inclusive).
 */
export function validateTemplate(input: TemplateInput): TemplateValidationResult {
  const errors: TemplateValidationError[] = []

  const subject = input.subject ?? ''
  const body = input.body ?? ''

  const subjectLen = subject.length
  if (subjectLen < TEMPLATE_LIMITS.subjectMin || subjectLen > TEMPLATE_LIMITS.subjectMax) {
    errors.push({
      field: 'subject',
      message: `Subject must be ${TEMPLATE_LIMITS.subjectMin} to ${TEMPLATE_LIMITS.subjectMax} characters.`,
    })
  }

  const bodyLen = body.length
  if (bodyLen < TEMPLATE_LIMITS.bodyMin || bodyLen > TEMPLATE_LIMITS.bodyMax) {
    errors.push({
      field: 'body',
      message: `Body must be ${TEMPLATE_LIMITS.bodyMin} to ${TEMPLATE_LIMITS.bodyMax} characters.`,
    })
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Modern notification default templates adhering to modern e-commerce standards.
 * Designed with warm, professional copy, clear order/case identifiers,
 * transparent status expectations, next-step links, and support sign-off.
 */
export interface ModernDefaultTemplate {
  event: NotificationEvent
  subject: string
  body: string
  channel: 'IN_APP' | 'EMAIL' | 'BOTH'
  isEnabled: boolean
  description: string
}

export const MODERN_DEFAULT_TEMPLATES: Record<NotificationEvent, ModernDefaultTemplate> = {
  ORDER_CONFIRMATION: {
    event: 'ORDER_CONFIRMATION',
    subject: 'Order Confirmed: #{{orderNumber}} — We\'re preparing your gear',
    body: `Hi {{customerName}},

Thank you for choosing RePXL! We've received order #{{orderNumber}} placed on {{orderDate}} for a total of {{orderTotal}}.

Our technicians are currently conducting a final inspection and safely packaging your vintage gear to ensure it arrives in pristine shooting condition.

What happens next:
• We will notify you as soon as your parcel is handed over to our courier partner.
• You will receive a tracking number and delivery timeline update.

Track or review your order details anytime:
https://repxl.com/account/orders/{{orderNumber}}

Warmly,
The RePXL Archive Team
Need help? Contact us at support@repxl.com`,
    channel: 'BOTH',
    isEnabled: true,
    description: 'Sent automatically right after a customer completes checkout.',
  },
  ORDER_STATUS_CHANGE: {
    event: 'ORDER_STATUS_CHANGE',
    subject: 'Order #{{orderNumber}} Update: {{status}}',
    body: `Hi {{customerName}},

There is an update regarding your order #{{orderNumber}}.

Current Status: {{status}}
Courier / Tracking: {{courierName}} {{trackingNumber}}

We take extra care with vintage camera equipment, ensuring all optics and delicate electronics remain protected throughout transit.

Track your shipment progress in real time:
https://repxl.com/account/orders/{{orderNumber}}

Thank you for shopping with RePXL!
The RePXL Team`,
    channel: 'BOTH',
    isEnabled: true,
    description: 'Triggered whenever order status or courier tracking is updated.',
  },
  RETURN_RECEIVED: {
    event: 'RETURN_RECEIVED',
    subject: 'Return Request Received: Order #{{orderNumber}} (Case #{{returnId}})',
    body: `Hi {{customerName}},

We have received your return request for order #{{orderNumber}} (Return Case #{{returnId}}).

Our team will carefully review your return submission and gear condition details within 1–2 business days.

What to expect:
• Once verified, we will confirm next steps or initiate your refund immediately.
• You can monitor your return request status in your account at any time.

Track return status:
https://repxl.com/account/orders/{{orderNumber}}

Warmly,
The RePXL Support Team
support@repxl.com`,
    channel: 'BOTH',
    isEnabled: true,
    description: 'Sent when a customer initiates a return request.',
  },
  RETURN_STATUS_CHANGE: {
    event: 'RETURN_STATUS_CHANGE',
    subject: 'Return Case #{{returnId}} Update: {{status}}',
    body: `Hi {{customerName}},

The status of your return case #{{returnId}} for order #{{orderNumber}} has been updated.

New Status: {{status}}

Please log in to your RePXL account to review the latest notes, instructions, or resolution details from our team:
https://repxl.com/account/orders/{{orderNumber}}

If you have any questions or need immediate assistance, simply reply to this message or contact support@repxl.com.

Best regards,
The RePXL Returns Department`,
    channel: 'BOTH',
    isEnabled: true,
    description: 'Sent when an admin updates a return case status (e.g. approved, received, inspected).',
  },
  REFUND_COMPLETED: {
    event: 'REFUND_COMPLETED',
    subject: 'Refund Processed: {{refundAmount}} for Order #{{orderNumber}}',
    body: `Hi {{customerName}},

Your refund for order #{{orderNumber}} has been processed successfully.

Refund Amount: {{refundAmount}}
Payment Method: Credited back to your original payment method

Depending on your financial provider or e-wallet (GCash, Maya, Card), the reflected amount should appear within 1 to 5 business days.

Thank you for your patience throughout this process. We look forward to serving your vintage photography journey again soon!

Sincerely,
The RePXL Finance Team
support@repxl.com`,
    channel: 'BOTH',
    isEnabled: true,
    description: 'Sent when an admin or automated processor marks a refund as completed.',
  },
  PROMOTION: {
    event: 'PROMOTION',
    subject: 'Special Offer: {{promoTitle}}',
    body: `Hi {{customerName}},

We're excited to share an exclusive offer from the RePXL Archive:

{{promoTitle}}

Use promo code at checkout: {{promoCode}}

Whether you're looking for iconic CCD compacts, retro DSLRs, or rare vintage glass, now is the perfect time to add to your collection.

Shop the collection:
https://repxl.com/products

Happy shooting,
The RePXL Team
*Offer terms and conditions apply. Limited time only.`,
    channel: 'BOTH',
    isEnabled: true,
    description: 'Sent to customers who have opted in to promotional announcements and discount vouchers.',
  },
  REPIXL_UPDATE: {
    event: 'REPIXL_UPDATE',
    subject: '{{updateTitle}} — Notes from RePXL',
    body: `Hi {{customerName}},

We have an update to share from the RePXL Archive:

{{updateTitle}}

{{updateBody}}

Explore the latest additions and curated stories on our storefront:
https://repxl.com

Best regards,
The RePXL Team`,
    channel: 'BOTH',
    isEnabled: true,
    description: 'Platform and community announcements sent to all registered customers.',
  },
}

/**
 * Realistic sample context data used for live previews and testing.
 */
export const SAMPLE_TEMPLATE_CONTEXT: Record<string, string> = {
  customerName: 'Alex Rivera',
  orderNumber: 'RPX-MTR9028',
  status: 'SHIPPED',
  orderStatus: 'SHIPPED',
  orderTotal: '₱14,500.00',
  orderDate: 'September 14, 2026',
  courierName: 'LBC Express',
  trackingNumber: 'LBC-992014881PH',
  courierEstimate: '2-3 Business Days',
  returnId: 'RET-88210',
  returnRequestId: 'RET-88210',
  returnStatus: 'APPROVED',
  refundAmount: '₱14,500.00',
  promoTitle: 'Mid-Season CCD Drop — 15% Off Vintage Digicams',
  promotionTitle: 'Mid-Season CCD Drop — 15% Off Vintage Digicams',
  promoCode: 'DIGICAM15',
  promotionCode: 'DIGICAM15',
  promoBody: 'Enjoy 15% off selected vintage compact cameras and prime lenses.',
  promotionBody: 'Enjoy 15% off selected vintage compact cameras and prime lenses.',
  updateTitle: 'Introducing the Vintage CCD Sensor Grading Guide',
  updateBody: 'We have updated our grading standard with raw CCD sensor test frames for every camera listed.',
}

