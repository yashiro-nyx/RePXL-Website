import { prisma } from '../src/lib/prisma'
import { DEFAULT_STATIC_PAGES } from '../src/lib/cms-defaults'

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runWithRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  let lastError: any
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      console.log(`  [Attempt ${i + 1}/${retries}] Connection failed, retrying in ${delay}ms...`)
      await sleep(delay)
      delay *= 1.5
    }
  }
  throw lastError
}

async function main() {
  console.log('🔄 Backfilling CMS data with retry...')

  await runWithRetry(async () => {
    // 1. Static Pages
    let pageCreatedCount = 0
    for (const page of DEFAULT_STATIC_PAGES) {
      const existing = await prisma.staticPage.findUnique({ where: { slug: page.slug } })
      if (!existing) {
        await prisma.staticPage.create({ data: page })
        pageCreatedCount++
        console.log(`  ✓ Created static page: ${page.slug}`)
      } else {
        console.log(`  - Page ${page.slug} already exists`)
      }
    }
    console.log(`  Total new static pages created: ${pageCreatedCount}`)

    // 2. Update existing banner records so their images match the customer storefront
    const stripBanner = await prisma.banner.findFirst({
      where: { placement: 'HOMEPAGE_STRIP' },
    })
    if (stripBanner && (stripBanner.imageRef === '/images/editorial-2.svg' || !stripBanner.imageRef)) {
      await prisma.banner.update({
        where: { id: stripBanner.id },
        data: {
          imageRef: '/images/dealbanner.png',
          title: 'Hottest Deals',
        },
      })
      console.log('  ✓ Updated HOMEPAGE_STRIP banner imageRef to /images/dealbanner.png')
    }

    const sidebarBanner = await prisma.banner.findFirst({
      where: { placement: 'SIDEBAR' },
    })
    if (sidebarBanner && (sidebarBanner.imageRef === '/images/product-sony-w800.svg' || !sidebarBanner.imageRef)) {
      await prisma.banner.update({
        where: { id: sidebarBanner.id },
        data: {
          imageRef: '/images/banner2.png',
          title: 'Sony Cyber-shot W800',
        },
      })
      console.log('  ✓ Updated SIDEBAR banner imageRef to /images/banner2.png')
    }
  })

  console.log('✅ CMS backfill complete!')
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

