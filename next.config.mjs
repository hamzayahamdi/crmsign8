/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Only use standalone output in production (Vercel) to avoid Windows symlink issues
  ...(process.env.VERCEL === '1' ? { output: 'standalone' } : {}),
}

export default nextConfig
