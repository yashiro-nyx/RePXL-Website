/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
