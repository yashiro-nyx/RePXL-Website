import { NotificationList } from '@/components/account/NotificationList'

/**
 * /account/notifications — All Notifications
 *
 * Shows the full inbox. Category sub-nav tabs link to the dedicated
 * subroutes (/order-updates, /promotions, /repixl-updates) so users
 * can also navigate directly from the sidebar.
 */
export default function AllNotificationsPage() {
  return (
    <NotificationList
      filter="ALL"
      heading="Notifications"
      showTabs
    />
  )
}
