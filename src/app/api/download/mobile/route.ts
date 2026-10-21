import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { MOBILE_APP_RELEASE } from '@/lib/mobile-download'

export const dynamic = 'force-dynamic'

/**
 * GET /api/download/mobile
 *
 * Direct download and metadata endpoint for the RePXL Android Mobile APK.
 * - If requested with `?info=true` or `Accept: application/json`: returns JSON metadata.
 * - If requested with `?redirect=true`: returns 307 redirect to the EAS CDN URL.
 * - Default: streams the APK directly with `Content-Disposition: attachment; filename="RePXL.apk"`,
 *   ensuring browsers save the file as `RePXL.apk` rather than Expo's internal build name.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const isInfo = url.searchParams.get('info') === 'true'
  const isRedirect = url.searchParams.get('redirect') === 'true'
  const acceptHeader = req.headers.get('accept') ?? ''

  // 1. JSON metadata query
  if (isInfo || (acceptHeader.includes('application/json') && !acceptHeader.includes('text/html'))) {
    return NextResponse.json(
      {
        success: true,
        data: MOBILE_APP_RELEASE,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=600',
        },
      }
    )
  }

  // 2. Explicit redirect query
  if (isRedirect) {
    const redirectResponse = NextResponse.redirect(MOBILE_APP_RELEASE.downloadUrl, 307)
    redirectResponse.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600')
    redirectResponse.headers.set(
      'Content-Disposition',
      `attachment; filename="${MOBILE_APP_RELEASE.apkFileName}"`
    )
    return redirectResponse
  }

  // 3. Check for local standalone APK build on disk (local development / self-hosted)
  try {
    const localApkPath = path.resolve(
      process.cwd(),
      'react-native/.expo/apk-rebuild-2026-10-21/RePXL-preview-2026-10-21.apk'
    )
    if (fs.existsSync(localApkPath)) {
      const stats = fs.statSync(localApkPath)
      const nodeStream = fs.createReadStream(localApkPath)
      const webStream = Readable.toWeb(nodeStream) as ReadableStream

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': `attachment; filename="${MOBILE_APP_RELEASE.apkFileName}"`,
          'Content-Length': stats.size.toString(),
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      })
    }
  } catch (err) {
    console.warn('Unable to read local APK file, falling back to CDN proxy:', err)
  }

  // 4. Remote streaming from verified EAS CDN
  try {
    const upstreamRes = await fetch(MOBILE_APP_RELEASE.downloadUrl, { redirect: 'follow' })
    if (upstreamRes.ok && upstreamRes.body) {
      const contentLength =
        upstreamRes.headers.get('content-length') || MOBILE_APP_RELEASE.fileSizeBytes.toString()

      return new NextResponse(upstreamRes.body as ReadableStream, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': `attachment; filename="${MOBILE_APP_RELEASE.apkFileName}"`,
          'Content-Length': contentLength,
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      })
    }
  } catch (err) {
    console.error('Failed to proxy APK from CDN, falling back to redirect:', err)
  }

  // 5. Final fallback: 307 redirect
  const redirectResponse = NextResponse.redirect(MOBILE_APP_RELEASE.downloadUrl, 307)
  redirectResponse.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600')
  redirectResponse.headers.set(
    'Content-Disposition',
    `attachment; filename="${MOBILE_APP_RELEASE.apkFileName}"`
  )
  return redirectResponse
}
