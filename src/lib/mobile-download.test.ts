import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import {
  MOBILE_APP_RELEASE,
  MOBILE_FEATURE_HIGHLIGHTS,
  ANDROID_INSTALL_STEPS,
} from './mobile-download'
import { GET as mobileDownloadGet } from '@/app/api/download/mobile/route'
import { GET as mobileQrGet } from '@/app/api/download/qr/route'

describe('mobile-download metadata', () => {
  it('exposes verified release metadata matching the October 21 Pixel 10 Pro APK', () => {
    expect(MOBILE_APP_RELEASE.version).toBe('1.0.0')
    expect(MOBILE_APP_RELEASE.buildCode).toBe(1)
    expect(MOBILE_APP_RELEASE.releaseDate).toBe('2026-10-21')
    expect(MOBILE_APP_RELEASE.packageName).toBe('com.repxl.mobile')
    expect(MOBILE_APP_RELEASE.appName).toBe('RePXL Mobile')
    expect(MOBILE_APP_RELEASE.fileSizeBytes).toBe(133400465)
    expect(MOBILE_APP_RELEASE.fileSizeFormatted).toBe('127.2 MB')
    expect(MOBILE_APP_RELEASE.sha256).toBe(
      '9253381E0963BFC377D4864E193F5B742A76184056546CCFAC69B99E65DBA331'
    )
    expect(MOBILE_APP_RELEASE.signatureScheme).toContain('Scheme v2')
    expect(MOBILE_APP_RELEASE.supportedArchitectures).toEqual([
      'arm64-v8a',
      'armeabi-v7a',
      'x86',
      'x86_64',
    ])
    expect(MOBILE_APP_RELEASE.downloadUrl).toMatch(/^https:\/\/expo\.dev\/artifacts\/eas\/.+\.apk$/)
    expect(MOBILE_APP_RELEASE.apiDownloadPath).toBe('/api/download/mobile')
    expect(MOBILE_APP_RELEASE.apkFileName).toBe('RePXL.apk')
    expect(MOBILE_APP_RELEASE.iosModulesBundled).toBe(1417)
  })

  it('provides feature highlights covering core mobile capabilities', () => {
    expect(MOBILE_FEATURE_HIGHLIGHTS.length).toBe(6)
    const ids = MOBILE_FEATURE_HIGHLIGHTS.map((f) => f.id)
    expect(ids).toContain('catalog-grading')
    expect(ids).toContain('comparison')
    expect(ids).toContain('order-timeline')
    expect(ids).toContain('ai-concierge')
    expect(ids).toContain('native-returns')
    expect(ids).toContain('notifications')

    for (const feature of MOBILE_FEATURE_HIGHLIGHTS) {
      expect(feature.title.length).toBeGreaterThan(5)
      expect(feature.description.length).toBeGreaterThan(20)
      expect(feature.category).toBeTruthy()
    }
  })

  it('defines sequential, actionable Android installation steps', () => {
    expect(ANDROID_INSTALL_STEPS.length).toBe(4)
    expect(ANDROID_INSTALL_STEPS.map((s) => s.step)).toEqual([1, 2, 3, 4])
    expect(ANDROID_INSTALL_STEPS[0].instruction).toContain('Download')
    expect(ANDROID_INSTALL_STEPS[1].instruction).toContain('Download anyway')
    expect(ANDROID_INSTALL_STEPS[2].instruction).toContain('Allow from this source')
    expect(ANDROID_INSTALL_STEPS[3].instruction).toContain('Install')
  })
})

describe('GET /api/download/mobile', () => {
  it('returns JSON release info when requested with ?info=true', async () => {
    const req = new NextRequest('http://localhost:3000/api/download/mobile?info=true')
    const res = await mobileDownloadGet(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.version).toBe('1.0.0')
    expect(json.data.sha256).toBe(MOBILE_APP_RELEASE.sha256)
  })

  it('returns JSON release info when requested with Accept: application/json header', async () => {
    const req = new NextRequest('http://localhost:3000/api/download/mobile', {
      headers: { Accept: 'application/json' },
    })
    const res = await mobileDownloadGet(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.fileSizeBytes).toBe(133400465)
  })

  it('serves the APK file stream directly with RePXL.apk attachment header', async () => {
    const req = new NextRequest('http://localhost:3000/api/download/mobile')
    const res = await mobileDownloadGet(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/vnd.android.package-archive')
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="RePXL.apk"')
    expect(res.headers.get('content-length')).toBe('133400465')
  })

  it('supports explicit redirect with ?redirect=true', async () => {
    const req = new NextRequest('http://localhost:3000/api/download/mobile?redirect=true')
    const res = await mobileDownloadGet(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(MOBILE_APP_RELEASE.downloadUrl)
    expect(res.headers.get('content-disposition')).toContain('attachment; filename="RePXL.apk"')
  })
})

describe('GET /api/download/qr', () => {
  it('generates a valid PNG QR code image', async () => {
    const req = new NextRequest('http://localhost:3000/api/download/qr?size=200')
    const res = await mobileQrGet(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')

    const arrayBuffer = await res.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    // PNG magic bytes: 0x89, 'P', 'N', 'G'
    expect(bytes[0]).toBe(0x89)
    expect(bytes[1]).toBe(0x50) // 'P'
    expect(bytes[2]).toBe(0x4e) // 'N'
    expect(bytes[3]).toBe(0x47) // 'G'
  })

  it('generates a valid SVG QR code when requested with format=svg', async () => {
    const req = new NextRequest('http://localhost:3000/api/download/qr?format=svg&size=240')
    const res = await mobileQrGet(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')

    const text = await res.text()
    expect(text).toContain('<svg')
    expect(text).toContain('xmlns="http://www.w3.org/2000/svg"')
  })
})

