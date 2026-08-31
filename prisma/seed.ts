import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Create Admin User ──────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('RePIXL2026!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@repixl-admin.com' },
    update: {},
    create: {
      email: 'admin@repixl-admin.com',
      password: adminPassword,
      firstName: 'RePXL',
      lastName: 'Admin',
      role: 'ADMIN',
      isSuperAdmin: true,
    },
  })
  console.log(`  ✓ Admin user: ${admin.email}`)

  // ─── Create Demo Customer ──────────────────────────────────────────────────
  const customerPassword = await bcrypt.hash('customer123', 12)
  const customer = await prisma.user.upsert({
    where: { email: 'demo@repxl.com' },
    update: {},
    create: {
      email: 'demo@repxl.com',
      password: customerPassword,
      firstName: 'Demo',
      lastName: 'Customer',
      phone: '+1 555-0100',
      role: 'CUSTOMER',
    },
  })
  console.log(`  ✓ Demo customer: ${customer.email}`)

  // ─── Seed Products ──────────────────────────────────────────────────────────
  const productsData = [
    {
      slug: 'canon-powershot-a520',
      name: 'Canon PowerShot A520',
      brand: 'Canon',
      series: 'PowerShot',
      price: 89,
      condition: 'EXCELLENT' as const,
      image: '/images/product-canon-a520.svg',
      stock: 2,
      description: "The A520 was Canon's entry-level workhorse in 2005 — 4 megapixels, a surprisingly sharp 4x zoom lens, and that signature Canon CCD warmth that flatters skin tones without trying. This unit shows only light wear on the grip edges and battery door; the lens mechanism is smooth, the LCD is scratch-free, and the sensor still delivers those saturated, slightly crushed shadows that made early PowerShots a TikTok rediscovery.",
      status: 'ACTIVE' as const,
      megapixels: 4,
      zoom: '4× Optical',
      storage: 'CompactFlash',
      year: 2005,
    },
    {
      slug: 'nikon-coolpix-3200',
      name: 'Nikon Coolpix 3200',
      brand: 'Nikon',
      series: 'Coolpix',
      price: 65,
      condition: 'MINT' as const,
      image: '/images/product-nikon-coolpix.svg',
      stock: 1,
      description: "A true time capsule. The Coolpix 3200 was Nikon's ultra-compact pocket camera of 2004 — 3.2MP, a sliding lens cover, and a color profile that runs cooler than Canon but punches greens and blues beautifully. This particular unit appears to have been stored unused; there are zero marks on the body, the lens cover mechanism snaps with factory crispness, and the original wrist strap is still attached.",
      status: 'ACTIVE' as const,
      megapixels: 3.2,
      zoom: '3× Optical',
      storage: 'SD Card',
      year: 2004,
    },
    {
      slug: 'sony-cybershot-w800',
      name: 'Sony CyberShot W800',
      brand: 'Sony',
      series: 'CyberShot',
      price: 110,
      condition: 'GOOD' as const,
      image: '/images/product-sony-w800.svg',
      stock: 3,
      description: "The W800 bridges the gap between vintage charm and modern resolution — 20.1MP in a body that still looks and feels like a classic CyberShot. This unit has been used regularly and shows honest wear: light scuffing on the top plate and a faint mark on the rear panel. All functions are perfect, the 5x zoom is snappy, and the high megapixel count means you can crop aggressively while keeping the digicam color character.",
      status: 'ACTIVE' as const,
      megapixels: 20.1,
      zoom: '5× Optical',
      storage: 'SD Card',
      year: 2014,
    },
    {
      slug: 'fujifilm-finepix-f30',
      name: 'Fujifilm FinePix F30',
      brand: 'Fujifilm',
      series: 'FinePix',
      price: 145,
      condition: 'EXCELLENT' as const,
      image: '/images/product-fuji-f30.svg',
      stock: 1,
      description: "Widely considered the best high-ISO compact of its generation. The F30's Super CCD sensor delivers usable ISO 1600 — unheard of in 2006 for a camera this small. Collectors chase it for its natural skin tones and the way it handles mixed lighting without turning everything orange. This unit has minimal cosmetic wear, a clean LCD, and the signature Fuji shutter sound that's become an ASMR favorite.",
      status: 'ACTIVE' as const,
      megapixels: 6.3,
      zoom: '3× Optical',
      storage: 'xD-Picture Card',
      year: 2006,
    },
    {
      slug: 'kodak-easyshare-c300',
      name: 'Kodak EasyShare C300',
      brand: 'Kodak',
      series: 'EasyShare',
      price: 45,
      condition: 'FAIR' as const,
      image: '/images/product-kodak-c300.svg',
      stock: 1,
      description: "The camera that lived in everyone's junk drawer — and that's exactly why people love it now. The C300 shoots soft, warm, slightly overexposed images that feel like a memory before you even process them. This unit is honest about its history: visible scratches on the silver body, a nick on the viewfinder surround, and a slightly loose battery door. But the lens is clean, the sensor works perfectly, and the Kodak color science is irreplaceable.",
      status: 'ACTIVE' as const,
      megapixels: 3.2,
      zoom: '3× Optical',
      storage: 'SD Card',
      year: 2004,
    },
    {
      slug: 'panasonic-lumix-dmc-fz7',
      name: 'Panasonic Lumix DMC-FZ7',
      brand: 'Panasonic',
      series: 'Lumix',
      price: 120,
      condition: 'MINT' as const,
      image: '/images/product-panasonic-fz7.svg',
      stock: 2,
      description: "The FZ7 punched well above its weight class in 2006: a Leica-branded 12x optical zoom in a body small enough for a jacket pocket, paired with Panasonic's MEGA O.I.S. stabilization. This mint unit looks like it came out of the box yesterday — no marks, no wear on the rubberized grip, and the zoom ring glides silently. The images it produces have a cinematic quality that bridge cameras of this era are famous for.",
      status: 'ACTIVE' as const,
      megapixels: 6,
      zoom: '12× Optical',
      storage: 'SD Card',
      year: 2006,
    },
    {
      slug: 'canon-ixus-400',
      name: 'Canon IXUS 400',
      brand: 'Canon',
      series: 'IXUS',
      price: 95,
      condition: 'GOOD' as const,
      image: '/images/product-canon-a520.svg',
      stock: 1,
      description: "The IXUS 400 was Canon's premium compact in 2003 — a stainless steel body that felt like jewelry, paired with a fast f/2.8 lens. The metal construction means this one has aged gracefully: the brushed finish shows honest patina from pocket carry, and there's a small ding on the top-left corner, but the mechanical internals are tight and the 4MP CCD still produces that creamy Canon rendering that no phone filter can replicate.",
      status: 'ACTIVE' as const,
      megapixels: 4,
      zoom: '3× Optical',
      storage: 'CompactFlash',
      year: 2003,
    },
    {
      slug: 'nikon-coolpix-5600',
      name: 'Nikon Coolpix 5600',
      brand: 'Nikon',
      series: 'Coolpix',
      price: 75,
      condition: 'EXCELLENT' as const,
      image: '/images/product-nikon-coolpix.svg',
      stock: 3,
      description: "Nikon's 2005 refresh of the Coolpix line brought 5 megapixels and a more refined JPEG engine to the pocketable format. The 5600 is loved for its neutral color balance that takes well to editing — warmer than the 3200 without Canon's magenta lean. This unit has been lightly used with only a hairline mark on the rear casing. The VR-assist focus is still accurate and the macro mode gets impressively close.",
      status: 'ACTIVE' as const,
      megapixels: 5,
      zoom: '3× Optical',
      storage: 'SD Card',
      year: 2005,
    },
    {
      slug: 'sony-cybershot-dsc-p200',
      name: 'Sony CyberShot DSC-P200',
      brand: 'Sony',
      series: 'CyberShot',
      price: 130,
      condition: 'MINT' as const,
      image: '/images/product-sony-w800.svg',
      stock: 1,
      description: "Sony's 2005 flagship compact — the P200 married a Carl Zeiss Vario-Tessar lens to a 7.2MP sensor in a flat, all-metal body that still looks futuristic. The Zeiss optics produce noticeably sharper corner-to-corner images than its competitors, and Sony's Real Imaging Processor gives punchy contrast without crushing detail. This unit is flawless — no scratches, original lens cap included, sensor is spotless under macro inspection.",
      status: 'ACTIVE' as const,
      megapixels: 7.2,
      zoom: '3× Optical',
      storage: 'Memory Stick Duo',
      year: 2005,
    },
    {
      slug: 'kodak-pixpro-fz53',
      name: 'Kodak PixPro FZ53',
      brand: 'Kodak',
      series: 'PixPro',
      price: 55,
      condition: 'GOOD' as const,
      image: '/images/product-kodak-c300.svg',
      stock: 2,
      description: "A modern camera wearing vintage colors. The FZ53 was Kodak's 2016 budget compact — 16MP and a 5x zoom in a body that costs less than dinner, but still processes images through Kodak's color pipeline, producing that warm, slightly faded Kodachrome-adjacent look straight out of camera. This unit has normal handling wear and a small scratch on the LCD that's invisible when the screen is on. Great for someone who wants Kodak color without hunting for 2004 hardware.",
      status: 'ACTIVE' as const,
      megapixels: 16,
      zoom: '5× Optical',
      storage: 'SD Card',
      year: 2016,
    },
    {
      slug: 'fujifilm-finepix-a500',
      name: 'Fujifilm FinePix A500',
      brand: 'Fujifilm',
      series: 'FinePix',
      price: 40,
      condition: 'FAIR' as const,
      image: '/images/product-fuji-f30.svg',
      stock: 0,
      description: "The A500 was Fuji's entry point in 2007 — 5.1 megapixels, basic controls, and a plastic body that doesn't pretend to be more than it is. What it does offer is Fuji's color science at the lowest possible price: the greens are lush, reds are vibrant without clipping, and the auto white balance handles mixed lighting better than cameras twice the cost. This unit shows significant body wear and a loose xD card slot cover, but the optics and sensor are unaffected.",
      status: 'ACTIVE' as const,
      megapixels: 5.1,
      zoom: '3× Optical',
      storage: 'xD-Picture Card',
      year: 2007,
    },
    {
      slug: 'panasonic-lumix-dmc-tz3',
      name: 'Panasonic Lumix DMC-TZ3',
      brand: 'Panasonic',
      series: 'Lumix',
      price: 100,
      condition: 'EXCELLENT' as const,
      image: '/images/product-panasonic-fz7.svg',
      stock: 1,
      description: "The TZ3 was Panasonic's travel zoom revelation — a 10x Leica lens in a body barely larger than a deck of cards. In 2007, nothing else offered this zoom range at this size. Collectors prize it for landscape and street photography where the compression of a long zoom creates a look that wide-angle phones can't touch. This unit has been carefully used: clean lens elements, a tight zoom mechanism, and only very faint wear on the mode dial lettering.",
      status: 'ACTIVE' as const,
      megapixels: 7.2,
      zoom: '10× Optical',
      storage: 'SD Card',
      year: 2007,
    },
  ]

  for (const p of productsData) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    })
  }
  console.log(`  ✓ ${productsData.length} products seeded`)

  // ─── Seed Reviews ───────────────────────────────────────────────────────────
  // Create reviewer users first
  const reviewerPassword = await bcrypt.hash('reviewer123', 12)
  const reviewerEmails = [
    { email: 'mia@example.com', firstName: 'Mia', lastName: 'Rivera' },
    { email: 'jordan@example.com', firstName: 'Jordan', lastName: 'Torres' },
    { email: 'alyssa@example.com', firstName: 'Alyssa', lastName: 'Kim' },
    { email: 'sam@example.com', firstName: 'Sam', lastName: 'Davis' },
    { email: 'chris@example.com', firstName: 'Chris', lastName: 'Lee' },
    { email: 'taylor@example.com', firstName: 'Taylor', lastName: 'Morgan' },
    { email: 'riley@example.com', firstName: 'Riley', lastName: 'Nguyen' },
    { email: 'morgan@example.com', firstName: 'Morgan', lastName: 'Patel' },
  ]

  const reviewerUsers: Record<string, string> = {}
  for (const r of reviewerEmails) {
    const user = await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: {
        email: r.email,
        password: reviewerPassword,
        firstName: r.firstName,
        lastName: r.lastName,
        role: 'CUSTOMER',
      },
    })
    reviewerUsers[r.email] = user.id
  }

  // Get product IDs by slug
  const allProducts = await prisma.product.findMany({ select: { id: true, slug: true } })
  const productMap = Object.fromEntries(allProducts.map((p) => [p.slug, p.id]))

  const reviewsData = [
    {
      productSlug: 'canon-powershot-a520',
      reviewerEmail: 'mia@example.com',
      reviewerName: 'Mia R.',
      rating: 5,
      comment: 'The condition grading is legit — arrived exactly as described. That warm 2004 sensor look is unmatched.',
      verifiedPurchase: true,
    },
    {
      productSlug: 'canon-powershot-a520',
      reviewerEmail: 'jordan@example.com',
      reviewerName: 'Jordan T.',
      rating: 4,
      comment: "Great little camera. Only minor scuff on the battery door that wasn't visible in photos, but functionally perfect.",
      verifiedPurchase: true,
    },
    {
      productSlug: 'nikon-coolpix-3200',
      reviewerEmail: 'alyssa@example.com',
      reviewerName: 'Alyssa K.',
      rating: 5,
      comment: "Mint condition means mint condition here. Looks like it was never used. The colors from this sensor are chef's kiss.",
      verifiedPurchase: true,
    },
    {
      productSlug: 'sony-cybershot-w800',
      reviewerEmail: 'sam@example.com',
      reviewerName: 'Sam D.',
      rating: 3,
      comment: 'Decent camera for the price. The "Good" condition rating was accurate — visible wear but works fine.',
      verifiedPurchase: false,
    },
    {
      productSlug: 'sony-cybershot-w800',
      reviewerEmail: 'chris@example.com',
      reviewerName: 'Chris L.',
      rating: 4,
      comment: 'Really impressed by the 20MP sensor on a digicam this old. Great for social media content.',
      verifiedPurchase: true,
    },
    {
      productSlug: 'fujifilm-finepix-f30',
      reviewerEmail: 'taylor@example.com',
      reviewerName: 'Taylor M.',
      rating: 5,
      comment: "The legendary F30 — ISO performance that cameras twice the price couldn't match in 2006. Still holds up.",
      verifiedPurchase: true,
    },
    {
      productSlug: 'panasonic-lumix-dmc-fz7',
      reviewerEmail: 'riley@example.com',
      reviewerName: 'Riley N.',
      rating: 4,
      comment: '12x zoom in a compact body is wild. The Leica-branded lens produces lovely images. Shipping was fast too.',
      verifiedPurchase: true,
    },
    {
      productSlug: 'panasonic-lumix-dmc-fz7',
      reviewerEmail: 'morgan@example.com',
      reviewerName: 'Morgan P.',
      rating: 5,
      comment: "This was my first digicam in high school. Bought it again for nostalgia and it's in better shape than my original.",
      verifiedPurchase: false,
    },
  ]

  for (const r of reviewsData) {
    const productId = productMap[r.productSlug]
    const userId = reviewerUsers[r.reviewerEmail]
    if (!productId || !userId) continue

    await prisma.review.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: {
        productId,
        userId,
        reviewerName: r.reviewerName,
        rating: r.rating,
        comment: r.comment,
        verifiedPurchase: r.verifiedPurchase,
      },
    })
  }
  console.log(`  ✓ ${reviewsData.length} reviews seeded`)

  // ─── Seed Vouchers ──────────────────────────────────────────────────────────
  const vouchersData = [
    {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE' as const,
      discountValue: 10,
      minPurchase: 50,
      maxDiscount: 20,
      usageLimit: 100,
      perUserLimit: 1,
      used: 23,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-12-31'),
      status: 'ACTIVE' as const,
      description: 'Welcome discount for new customers',
    },
    {
      code: 'SUMMER15',
      discountType: 'PERCENTAGE' as const,
      discountValue: 15,
      minPurchase: 100,
      maxDiscount: 30,
      usageLimit: 50,
      perUserLimit: 1,
      used: 12,
      validFrom: new Date('2026-06-01'),
      validUntil: new Date('2026-08-31'),
      status: 'ACTIVE' as const,
      description: 'Summer sale promotion',
    },
    {
      code: 'FLAT5',
      discountType: 'FIXED' as const,
      discountValue: 5,
      minPurchase: 30,
      maxDiscount: 5,
      usageLimit: 200,
      perUserLimit: 3,
      used: 87,
      validFrom: new Date('2026-01-01'),
      validUntil: new Date('2026-06-30'),
      status: 'EXPIRED' as const,
      description: 'Flat $5 off any order over $30',
    },
  ]

  for (const v of vouchersData) {
    await prisma.voucher.upsert({
      where: { code: v.code },
      update: {},
      create: v,
    })
  }
  console.log(`  ✓ ${vouchersData.length} vouchers seeded`)

  // ─── Seed Admin Log ─────────────────────────────────────────────────────────
  await prisma.adminLog.create({
    data: {
      action: 'SYSTEM_SEED',
      details: 'Database seeded with initial data',
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
    },
  })
  console.log('  ✓ Initial admin log entry created')

  console.log('\n✅ Seeding complete!')
  console.log('\n📋 Credentials:')
  console.log('   Admin:    admin@repixl-admin.com / RePIXL2026!')
  console.log('   Customer: demo@repxl.com / customer123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
