import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isPageVisibleTo } from '@/lib/cms'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { CmsPageLayout } from '@/components/layout/CmsPageLayout'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function StaticPageView({ params }: Props) {
  const { slug } = await params
  const page = await prisma.staticPage.findUnique({
    where: { slug: slug.toLowerCase() },
  })

  if (!page) {
    notFound()
  }

  const admin = await getCurrentAdmin()
  const isVisible = isPageVisibleTo(page.status, !!admin)

  if (!isVisible) {
    notFound()
  }

  return (
    <CmsPageLayout
      title={page.title}
      body={page.body}
      updatedAt={page.updatedAt}
      isDraft={page.status === 'DRAFT'}
    />
  )
}
