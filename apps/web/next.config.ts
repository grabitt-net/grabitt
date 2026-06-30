import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@grabitt/design-tokens', '@grabitt/types', '@grabitt/api-client'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}

export default nextConfig
