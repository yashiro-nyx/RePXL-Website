import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { MOBILE_APP_RELEASE } from '@/lib/mobile-download'

export const dynamic = 'force-dynamic'

/**
 * GET /api/download/qr
 *
 * Generates an on-the-fly QR code for mobile scanning.
 * Query parameters:
 * - target: 'page' (default) -> links to the mobile download landing page
 *           'apk' -> links directly to the APK download
 * - format: 'png' (default) | 'svg'
 * - size: pixel width/height (default: 280)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const target = url.searchParams.get('target') === 'apk' ? 'apk' : 'page'
    const format = url.searchParams.get('format') === 'svg' ? 'svg' : 'png'
    const sizeParam = parseInt(url.searchParams.get('size') || '280', 10)
    const size = Math.min(Math.max(isNaN(sizeParam) ? 280 : sizeParam, 120), 800)

    // Construct the destination URL using request origin or production fallback
    const origin = url.origin || 'https://repxl.com'
    const targetUrl =
      target === 'apk'
        ? `${origin}${MOBILE_APP_RELEASE.apiDownloadPath}`
        : `${origin}/download`

    if (format === 'svg') {
      const svgString = await QRCode.toString(targetUrl, {
        type: 'svg',
        width: size,
        margin: 2,
        color: {
          dark: '#1A1816',
          light: '#00000000', // transparent background
        },
      })

      return new NextResponse(svgString, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        },
      })
    }

    // Default: PNG buffer
    const pngBuffer = await QRCode.toBuffer(targetUrl, {
      width: size,
      margin: 2,
      color: {
        dark: '#1A1816',
        light: '#FFFFFF',
      },
    })

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pngBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Failed to generate download QR code:', error)
    return new NextResponse('Failed to generate QR code', { status: 500 })
  }
}

