import { NotificationList } from '@/components/account/NotificationList'

/** /account/notifications/order-updates — orders, shipping, payments, returns */
export default function OrderUpdatesPage() {
  return <NotificationList backendCategory="ORDER_UPDATES" heading="Order Updates" />
}
