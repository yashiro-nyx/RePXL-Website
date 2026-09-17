import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function PagesSlugRedirect({ params }: PageProps) {
  const { slug } = await params
  redirect(`/p/${slug}`)
}
