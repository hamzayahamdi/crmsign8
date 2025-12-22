/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // OPTIMIZATION: Enable image optimization for better performance
  images: {
    // Enable optimization (removed unoptimized: true)
    // Add image domains if using external images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
    // Optimize images for better performance
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // OPTIMIZATION: Enable compression in production
  compress: true,
  // Only use standalone output in production (Vercel) to avoid Windows symlink issues
  ...(process.env.VERCEL === '1' ? { output: 'standalone' } : {}),
}

export default nextConfig
