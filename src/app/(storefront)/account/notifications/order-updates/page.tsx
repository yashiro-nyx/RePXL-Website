import { NotificationList } from '@/components/account/NotificationList'

/** /account/notifications/order-updates */
export default function OrderUpdatesPage() {
  return (
    <NotificationList
      filter="ORDER_UPDATES"
      heading="Order Updates"
    />
  )
}
