/**
 * RePXL Mobile App release metadata and download configuration.
 *
 * Sourced from the verified EAS preview build 525fbef3 (2026-10-21)
 * and documented in react-native/README.md and docs/mobile-app-development-plan.md.
 */

export interface MobileAppReleaseInfo {
  version: string
  buildCode: number
  releaseDate: string
  packageName: string
  appName: string
  fileSizeFormatted: string
  fileSizeBytes: number
  sha256: string
  signatureScheme: string
  minAndroidVersion: string
  targetAndroidVersion: string
  supportedArchitectures: string[]
  downloadUrl: string
  apiDownloadPath: string
  apkFileName: string
  easBuildId: string
  iosStatus: 'TESTFLIGHT_PREVIEW' | 'COMING_SOON'
  iosModulesBundled: number
}

export const MOBILE_APP_RELEASE: MobileAppReleaseInfo = {
  version: '1.0.0',
  buildCode: 1,
  releaseDate: '2026-10-21',
  packageName: 'com.repxl.mobile',
  appName: 'RePXL Mobile',
  fileSizeFormatted: '127.2 MB',
  fileSizeBytes: 133400465,
  sha256: '9253381E0963BFC377D4864E193F5B742A76184056546CCFAC69B99E65DBA331',
  signatureScheme: 'APK Signature Scheme v2 (Verified)',
  minAndroidVersion: 'Android 7.0+ (API 24)',
  targetAndroidVersion: 'Android 15–17 (API 36–37, verified on Pixel 10 Pro)',
  supportedArchitectures: ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'],
  downloadUrl: 'https://expo.dev/artifacts/eas/7vFGQ0OfnS6Sr6jA72oS71R2f9cHWiGMQ2SloBDUqCs.apk',
  apiDownloadPath: '/api/download/mobile',
  apkFileName: 'RePXL.apk',
  easBuildId: '525fbef3-7090-4229-b7bc-5f6c20c115a4',
  iosStatus: 'TESTFLIGHT_PREVIEW',
  iosModulesBundled: 1417,
}

export interface MobileFeatureHighlight {
  id: string
  title: string
  category: string
  description: string
  iconName: 'camera' | 'compare' | 'bell' | 'shield' | 'bot' | 'truck'
}

export const MOBILE_FEATURE_HIGHLIGHTS: MobileFeatureHighlight[] = [
  {
    id: 'catalog-grading',
    title: 'Curated Digicams & Condition Grading',
    category: 'Catalog & Search',
    description:
      'Filter vintage CCD & CMOS sensors by era, brand, megapixel class, and condition tier (Mint to Fair) with verified authentic serial numbers.',
    iconName: 'camera',
  },
  {
    id: 'comparison',
    title: 'Side-by-Side Spec Comparison',
    category: 'Analysis Tool',
    description:
      'Directly compare vintage sensor dynamics, battery types, card compatibility, and zoom ranges before making your collector choice.',
    iconName: 'compare',
  },
  {
    id: 'order-timeline',
    title: 'Live Order Milestones & Push Alerts',
    category: 'Tracking & Dispatch',
    description:
      'Stay updated from order placement and courier packaging through real-time transit and doorstep confirmation.',
    iconName: 'truck',
  },
  {
    id: 'ai-concierge',
    title: 'AI Concierge Camera Advisor',
    category: 'Instant Support',
    description:
      'Get expert recommendations on vintage camera handling, battery/memory card requirements, and order inquiries directly on your phone.',
    iconName: 'bot',
  },
  {
    id: 'native-returns',
    title: 'Camera-Based Return Requests',
    category: 'Customer Care',
    description:
      'Submit return requests with direct camera photo evidence, inspection milestones, and refund tracking with parity to the web wizard.',
    iconName: 'shield',
  },
  {
    id: 'notifications',
    title: 'Integrated Notification Inbox',
    category: 'Communications',
    description:
      'Review store promotions, restock alerts, and order updates in a synchronized customer notification tray.',
    iconName: 'bell',
  },
]

export interface InstallStep {
  step: number
  title: string
  instruction: string
  note?: string
}

export const ANDROID_INSTALL_STEPS: InstallStep[] = [
  {
    step: 1,
    title: 'Download the APK',
    instruction:
      'Tap the "Download Standalone APK" button or scan the QR code with your phone camera to begin downloading the RePXL package.',
    note: 'File size is ~127 MB. Wi-Fi recommended.',
  },
  {
    step: 2,
    title: 'Confirm Browser Download',
    instruction:
      'If your browser prompts "File might be harmful", tap "Download anyway". This is Android standard prompt for any app installed outside Google Play.',
    note: 'Our package is cryptographically signed and SHA-256 verified.',
  },
  {
    step: 3,
    title: 'Allow Installation from Browser',
    instruction:
      'Open the downloaded file from your notifications or Downloads folder. If prompted, tap "Settings" and enable "Allow from this source".',
    note: 'You can disable this permission after installation completes.',
  },
  {
    step: 4,
    title: 'Install & Explore',
    instruction:
      'Tap "Install", wait a few moments for completion, and tap "Open" to launch RePXL. Log in with your website account or browse as guest!',
  },
]

