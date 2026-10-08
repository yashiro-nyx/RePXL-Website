/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production builds from replacing chunks used by a running dev server.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  images: {
    formats: ['image/avif', 'image/webp'],
    // Keep the existing editorial image quality while making the explicit
    // quality=90 usage compatible with Next's quality allowlist.
    qualities: [75, 90],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Product images are local SVGs today; these patterns allow moving to a
    // CDN (Cloudinary / S3+CloudFront) without further config changes.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
    ],
  },
}

export default nextConfig
