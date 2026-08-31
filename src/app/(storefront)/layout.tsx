/**
 * Storefront layout — pass-through only.
 * Footer is included per-page via the shared Footer/MinimalFooter components.
 * This exists to allow future storefront-level additions without restructuring.
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
