import { NotificationList } from '@/components/account/NotificationList'

/** /account/notifications/promotions */
export default function PromotionsPage() {
  return (
    <NotificationList
      filter="PROMOTIONS"
      heading="Promotions"
    />
  )
}
