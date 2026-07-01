/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@grabitt/design-tokens', '@grabitt/types', '@grabitt/api-client', '@grabitt/ui'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}

export default nextConfig
