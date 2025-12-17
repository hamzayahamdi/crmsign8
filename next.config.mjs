/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensure all routes are properly built
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

export default nextConfig
