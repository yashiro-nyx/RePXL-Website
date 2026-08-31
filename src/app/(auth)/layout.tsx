import { MinimalFooter } from '@/components/layout/MinimalFooter'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <MinimalFooter />
    </>
  )
}
