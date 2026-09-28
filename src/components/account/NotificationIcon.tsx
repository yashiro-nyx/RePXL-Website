import type { NotificationIcon as NotificationIconName } from '@/lib/notification-inapp'

/**
 * Shared category icon for notifications, used identically by the navbar
 * dropdown and the full Notifications page so the two surfaces stay visually
 * consistent. Icons are simple stroked line-icons matching RePXL's iconography.
 */

const PATHS: Record<NotificationIconName, React.ReactNode> = {
  order: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  payment: (
    <>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
    </>
  ),
  shipping: (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M14 9h4l4 4v4a1 1 0 0 1-1 1h-1" />
      <circle cx="7.5" cy="18.5" r="1.5" />
      <circle cx="17.5" cy="18.5" r="1.5" />
    </>
  ),
  return: (
    <>
      <path d="M3 7v6h6" />
      <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
    </>
  ),
  security: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  promotion: (
    <>
      <path d="M7.5 3h9L21 7.5v9L16.5 21h-9L3 16.5v-9Z" />
      <path d="M9 15 15 9" />
      <circle cx="9.5" cy="9.5" r="0.5" />
      <circle cx="14.5" cy="14.5" r="0.5" />
    </>
  ),
  update: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
}

export function NotificationIcon({
  icon,
  className = '',
  size = 16,
}: {
  icon: NotificationIconName
  className?: string
  size?: number
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[icon] ?? PATHS.update}
    </svg>
  )
}
