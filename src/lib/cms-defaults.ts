import { BannerPlacement } from '@prisma/client'

export interface DefaultBannerSeed {
  title: string
  imageRef: string
  placement: BannerPlacement
  linkTarget: string
  isActive: boolean
}

export interface DefaultHomepageBlockSeed {
  type: string
  displayOrder: number
  isPublished: boolean
  content: Record<string, any>
}

export const DEFAULT_LANDING_BANNERS: DefaultBannerSeed[] = [
  {
    title: 'More than just a photo.',
    imageRef: '/images/camherosec.png',
    placement: BannerPlacement.HOMEPAGE_HERO,
    linkTarget: 'https://repxl.com/products',
    isActive: true,
  },
  {
    title: 'Hottest Deals',
    imageRef: '/images/editorial-2.svg',
    placement: BannerPlacement.HOMEPAGE_STRIP,
    linkTarget: 'https://repxl.com/products',
    isActive: true,
  },
  {
    title: 'Our Staff Pick — Sony Cyber-shot W800',
    imageRef: '/images/product-sony-w800.svg',
    placement: BannerPlacement.SIDEBAR,
    linkTarget: 'https://repxl.com/products?brand=sony',
    isActive: true,
  },
]

export const DEFAULT_HOMEPAGE_BLOCKS: DefaultHomepageBlockSeed[] = [
  {
    type: 'editorial',
    displayOrder: 1,
    isPublished: true,
    content: {
      eyebrow: '— The digicam era',
      heading: 'Before filters, there was just light.',
      body: 'In the early 2000s, CCD sensors captured the world with an unapologetic warmth that modern smartphones cannot fake.',
      quoteAuthor: 'RePXL Editorial',
    },
  },
  {
    type: 'announcement',
    displayOrder: 2,
    isPublished: true,
    content: {
      title: 'Top Deals',
      badge: 'Up to 30% OFF',
      subtitle: 'Selected Brands',
      linkTarget: '/products',
    },
  },
]

