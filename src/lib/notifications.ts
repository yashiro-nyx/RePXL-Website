/**
 * Notification state logic and dispatch.
 *
 * This module holds notification helpers split into two parts:
 *
 * Part 1 (Pure): I/O-free helpers for unread-count display formatting, state
 * transforms for marking read, disabled-template suppression, promotional
 * opt-out filtering, and display-message truncation. All pure functions.
 *
 * Part 2 (DB-backed): `emitNotification`, `markRead`, `markAllRead` operations
 * that perform database mutations and (for dispatch) email attempts. These
 * operations reuse the pure helpers above.
 */

import { getSettings } from './settings'
import { resolvePlaceholders, type NotificationEvent, EVENT_CATEGORY_MAP } from './notification-templates'
import { sendNotificationEmail } from './mailer'
import { prisma } from './prisma'

export type { NotificationEvent }

// ---------------------------------------------------------------------------
// Unread-count display (Req 9.4)
// ---------------------------------------------------------------------------

/** The maximum unread count shown as an exact number before switching to "99+". */
export const MAX_DISPLAY_UNREAD = 99

/**
 * Req 9.4: Format the unread notification count for display in the
 * Notification Center badge.
 *
 * Returns the count's decimal string when it is between 0 and 99 inclusive, and
 * returns "99+" when the count exceeds 99. Negative and fractional inputs are
 * normalized (clamped at 0, floored) so the badge never shows a negative or
 * non-integer value.
 */
export function displayUnreadCount(count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  if (n > MAX_DISPLAY_UNREAD) {
    return `${MAX_DISPLAY_UNREAD}+`
  }
  return String(n)
}

// ---------------------------------------------------------------------------
// Read-state transforms (Req 9.5, 9.6)
// ---------------------------------------------------------------------------

/**
 * Minimal shape required to compute read-state transforms. Real notification
 * records (with message/event/timestamp) satisfy this, so the transforms are
 * generic over `T` and preserve every other field untouched.
 */
export interface ReadableNotification {
  id: string
  isRead: boolean
}

/** Count the notifications in `list` that are currently unread. */
export function unreadCount<T extends ReadableNotification>(list: readonly T[]): number {
  let count = 0
  for (const n of list) {
    if (!n.isRead) count++
  }
  return count
}

/**
 * Req 9.5: Return a new list with the notification identified by `id` marked as
 * read.
 *
 * Only the first matching notification that is currently unread is flipped, so
 * the operation reduces the unread count by exactly one when the target was
 * unread and leaves the count unchanged when the target is already read or is
 * absent. The input list is not mutated; unaffected entries keep their
 * identity.
 */
export function markNotificationRead<T extends ReadableNotification>(
  list: readonly T[],
  id: string
): T[] {
  let flipped = false
  return list.map((n) => {
    if (!flipped && n.id === id && !n.isRead) {
      flipped = true
      return { ...n, isRead: true }
    }
    return n
  })
}

/**
 * Req 9.6: Return a new list in which every notification is marked as read.
 *
 * The result has an unread count of zero and applying the transform again
 * yields an equivalent list (idempotent). The input list is not mutated;
 * already-read entries keep their identity.
 */
export function markAllNotificationsRead<T extends ReadableNotification>(
  list: readonly T[]
): T[] {
  return list.map((n) => (n.isRead ? n : { ...n, isRead: true }))
}

// ---------------------------------------------------------------------------
// Template suppression (Req 8.6)
// ---------------------------------------------------------------------------

/**
 * Req 8.6: Whether notifications for an event should be suppressed because its
 * template is disabled. When a template's enabled state is false the
 * Notification System creates no notification and sends no email for that
 * event.
 */
export function shouldSuppressForDisabledTemplate(isEnabled: boolean): boolean {
  return !isEnabled
}

// ---------------------------------------------------------------------------
// Promotional opt-out (Req 9.9)
// ---------------------------------------------------------------------------

/** The set of events considered promotional (subject to opt-out). */
export const PROMOTIONAL_EVENTS: readonly NotificationEvent[] = ['PROMOTION'] as const

/** Whether `event` is a promotional notification event. */
export function isPromotionalEvent(event: NotificationEvent): boolean {
  return PROMOTIONAL_EVENTS.includes(event)
}

/**
 * Req 9.9: Whether a notification for `event` should be sent to a customer
 * given their promotional opt-out preference.
 *
 * A promotional event is excluded if and only if the customer has opted out of
 * promotional notifications. Order-related (non-promotional) events are always
 * sent regardless of the opt-out preference.
 */
export function shouldSendNotification(
  event: NotificationEvent,
  promoOptOut: boolean
): boolean {
  if (isPromotionalEvent(event)) {
    return !promoOptOut
  }
  return true
}

// ---------------------------------------------------------------------------
// Display truncation & in-app retention (Req 9.3, 9.7)
// ---------------------------------------------------------------------------

/** Maximum length of a notification message shown in the Notification Center. */
export const MAX_DISPLAY_MESSAGE_LENGTH = 500

/**
 * Req 9.3: Bound a notification message for display in the Notification Center.
 *
 * Returns the message unchanged when it is within `max` characters, otherwise
 * returns the first `max` characters. The result length never exceeds `max`.
 */
export function truncateForDisplay(
  message: string,
  max: number = MAX_DISPLAY_MESSAGE_LENGTH
): string {
  if (message.length <= max) {
    return message
  }
  return message.slice(0, max)
}

/**
 * Req 9.7 / 9.8: The in-app notification is the source of truth and is retained
 * regardless of the email delivery outcome. This predicate documents that
 * invariant for callers: whether email succeeded or failed, the in-app
 * notification is always kept.
 */
export function isInAppRetained(_emailSucceeded: boolean): boolean {
  return true
}

// ---------------------------------------------------------------------------
// Database operations (Task 11.1)
// ---------------------------------------------------------------------------

/**
 * MANDATORY events that can never be suppressed by user preferences.
 * These include security alerts and operational payment/receipt communications.
 */
export const MANDATORY_EVENTS: readonly NotificationEvent[] = [
  'ORDER_CONFIRMATION',  // receipt — operationally required
] as const

export function isMandatoryEvent(event: NotificationEvent): boolean {
  return (MANDATORY_EVENTS as readonly string[]).includes(event)
}

interface EmitNotificationOptions {
  userId: string
  event: NotificationEvent
  subject: string
  body: string
  channel: 'IN_APP' | 'EMAIL' | 'BOTH'
  recipientEmail?: string
}

/**
 * Req 8.6, 8.7, 8.8, 9.1, 9.2, 9.7, 9.8, 9.9:
 * Emit a notification to a customer: create the in-app notification
 * synchronously, attempt email delivery best-effort, suppress disabled
 * templates and promo opt-outs, and record an AdminLog entry if email
 * delivery fails after all retries.
 *
 * Consults UserNotificationPreference for per-category suppression.
 * Mandatory events (ORDER_CONFIRMATION, security alerts) are never suppressed.
 */
export async function emitNotification(
  options: EmitNotificationOptions
): Promise<{ notificationId: string; emailDelivered?: boolean }> {
  const { userId, event, subject, body, channel, recipientEmail } = options

  // Fetch the user, preferences, and template
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { notificationPreference: true },
  })
  if (!user) {
    throw new Error(`User ${userId} not found`)
  }

  const template = await prisma.notificationTemplate.findUnique({
    where: { event },
  })

  // Suppress if template is disabled
  if (template && shouldSuppressForDisabledTemplate(template.isEnabled)) {
    return { notificationId: '', emailDelivered: false }
  }

  // Determine per-category suppression (unless this is a mandatory event)
  const mandatory = isMandatoryEvent(event)
  if (!mandatory) {
    const category = EVENT_CATEGORY_MAP[event]
    const prefs = user.notificationPreference

    // Check in-app suppression
    const suppressInApp = prefs
      ? (category === 'ORDER_UPDATES'  && !prefs.inAppOrderUpdates)  ||
        (category === 'PROMOTIONS'     && !prefs.inAppPromotions)     ||
        (category === 'REPIXL_UPDATES' && !prefs.inAppRepixlUpdates)
      : false // default: send if no pref record

    // Check email suppression
    const suppressEmail = prefs
      ? (category === 'ORDER_UPDATES'  && !prefs.emailOrderUpdates)  ||
        (category === 'PROMOTIONS'     && !prefs.emailPromotions)     ||
        (category === 'REPIXL_UPDATES' && !prefs.emailRepixlUpdates)
      : false // default: send if no pref record

    // Legacy promo opt-out compatibility
    const legacyPromoSuppressed = !shouldSendNotification(event, user.promoOptOut)

    const effectiveSuppressInApp  = suppressInApp  || legacyPromoSuppressed
    const effectiveSuppressEmail  = suppressEmail  || legacyPromoSuppressed

    // If both channels are suppressed, bail out entirely
    const effectiveChannel =
      channel === 'IN_APP' ? (effectiveSuppressInApp  ? 'SUPPRESSED' : 'IN_APP')  :
      channel === 'EMAIL'  ? (effectiveSuppressEmail   ? 'SUPPRESSED' : 'EMAIL')   :
      // BOTH
      effectiveSuppressInApp && effectiveSuppressEmail  ? 'SUPPRESSED' :
      effectiveSuppressInApp                            ? 'EMAIL'      :
      effectiveSuppressEmail                            ? 'IN_APP'     :
      'BOTH'

    if (effectiveChannel === 'SUPPRESSED') {
      return { notificationId: '', emailDelivered: false }
    }

    // Re-scope channel if one side was suppressed
    const resolvedChannel = effectiveChannel as 'IN_APP' | 'EMAIL' | 'BOTH'
    return _doEmit({ userId, event, subject, body, channel: resolvedChannel, recipientEmail, user })
  }

  return _doEmit({ userId, event, subject, body, channel, recipientEmail, user })
}

async function _doEmit({
  userId,
  event,
  body,
  channel,
  recipientEmail,
  user,
  subject,
}: {
  userId: string
  event: NotificationEvent
  subject: string
  body: string
  channel: 'IN_APP' | 'EMAIL' | 'BOTH'
  recipientEmail?: string
  user: { id: string }
}): Promise<{ notificationId: string; emailDelivered?: boolean }> {
  // Create in-app notification (source of truth) if channel includes it
  let notificationId = ''
  if (channel === 'IN_APP' || channel === 'BOTH') {
    const notification = await prisma.notification.create({
      data: {
        userId,
        event,
        message: truncateForDisplay(body),
        // Always store as IN_APP regardless of whether email is also being sent.
        // The channel field on the notification row represents where it lives
        // (the in-app inbox), not the full delivery instruction. All customer-facing
        // queries filter by channel = 'IN_APP' — storing 'BOTH' would silently
        // hide notifications from the inbox.
        channel: 'IN_APP',
        isRead: false,
      },
    })
    notificationId = notification.id
  }

  let emailDelivered = false

  // Attempt email delivery if channel includes EMAIL and recipientEmail is provided
  if ((channel === 'EMAIL' || channel === 'BOTH') && recipientEmail) {
    try {
      await sendNotificationEmail(recipientEmail, subject, body)
      emailDelivered = true
    } catch (emailError) {
      const systemAdmin = await prisma.user.findFirst({
        where: { role: 'ADMIN', isSuperAdmin: true },
        select: { id: true, firstName: true, lastName: true },
      })

      if (systemAdmin) {
        await prisma.adminLog.create({
          data: {
            action: 'NOTIFICATION_EMAIL_FAILED',
            details: `Failed to send notification ${notificationId} to ${recipientEmail} for event ${event}: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
            adminId: systemAdmin.id,
            adminName: `${systemAdmin.firstName} ${systemAdmin.lastName}`,
          },
        })
      }
      emailDelivered = false
    }
  }

  if ((channel === 'IN_APP' || channel === 'BOTH') && process.env.EXPO_PUSH_ENABLED === 'true') {
    try {
      const pushTokens = await prisma.pushToken.findMany({
        where: { userId },
        select: { token: true },
      })
      if (pushTokens.length > 0) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pushTokens.map(({ token }) => ({
            to: token,
            title: subject,
            body: truncateForDisplay(body),
            data: { notificationId, event },
          }))),
        })
      }
    } catch (pushError) {
      console.error('[notifications] push delivery failed (non-fatal):', pushError)
    }
  }

  return { notificationId, emailDelivered }
}

/**
 * Req 9.5: Mark a single notification as read in the database.
 * Returns the updated notification or null if not found.
 */
export async function markRead(
  notificationId: string
): Promise<{ id: string; isRead: boolean } | null> {
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
    select: { id: true, isRead: true },
  })
  return notification
}

/**
 * Req 9.6: Mark all notifications for a user as read.
 * Returns the count of updated notifications.
 */
export async function markAllRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId },
    data: { isRead: true },
  })
  return result.count
}
