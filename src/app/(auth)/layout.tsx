/**
 * Auth route group layout — no footer on Login / Register.
 * These are full-height focused authentication screens.
 */
export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
