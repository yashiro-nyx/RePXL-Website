/**
 * Server-side mapping from a stored Notification row to the display DTO the
 * client renders. Centralizes envelope parsing, legacy sanitization, and
 * display-category derivation so the preview API, the full-list API, and any
 * other consumer stay perfectly consistent.
 *
 * This layer is why the UI never has to regex-scrape the message for an order
 * number or guess a title: everything the client needs is resolved here from
 * validated content.
 */

import {
  parseInAppMessage,
  displayCategoryFor,
  DISPLAY_CATEGORY_META,
  type NotificationDisplayCategory,
  type NotificationIcon,
} from './notification-inapp'
import type { NotificationEvent } from './notification-templates'

/** Minimal row shape needed to build the view model. */
export interface NotificationRowLike {
  id: string
  event: string
  message: string
  isRead: boolean
  createdAt: Date | string
}

/** The client-facing notification shape returned by the notification APIs. */
export interface NotificationView {
  id: string
  event: string
  /** Short headline, e.g. "Order Shipped". */
  title: string
  /** One or two concise, human-readable sentences. Never raw tokens/JSON. */
  body: string
  /** Valid internal destination path, or null when there is no action. */
  href: string | null
  /** Fine-grained display category (Orders / Payments / Shipping / …). */
  category: NotificationDisplayCategory
  /** Icon identifier the component maps to an SVG. */
  icon: NotificationIcon
  isRead: boolean
  createdAt: string
}

/**
 * Read a status hint out of the concise body so shipping vs. order updates can
 * be distinguished for categorization without a separate stored field.
 */
function statusHintFromBody(title: string, body: string): string {
  return `${title} ${body}`
}

/** Convert a stored notification row into the display view model. */
export function toNotificationView(row: NotificationRowLike): NotificationView {
  const event = row.event as NotificationEvent
  const content = parseInAppMessage(row.message, event)
  const category = displayCategoryFor(event, statusHintFromBody(content.title, content.body))
  const meta = DISPLAY_CATEGORY_META[category]

  return {
    id: row.id,
    event: row.event,
    title: content.title,
    body: content.body,
    href: content.href,
    category,
    icon: meta.icon,
    isRead: row.isRead,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : row.createdAt.toISOString(),
  }
}

export function toNotificationViews(rows: NotificationRowLike[]): NotificationView[] {
  return rows.map(toNotificationView)
}
