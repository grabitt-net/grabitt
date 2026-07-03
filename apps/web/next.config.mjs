/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@grabitt/design-tokens', '@grabitt/types', '@grabitt/api-client', '@grabitt/ui', 'server'],
  // The tRPC API + webhooks now run inside this app as route handlers, importing
  // the backend from the `server` package. Keep native/heavy backend packages
  // external so they're required from node_modules at runtime (not bundled).
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client', 'prisma', 'stripe', 'jsonwebtoken', 'bcryptjs',
      'qrcode', 'resend', 'twilio', 'pg-boss', 'cloudinary',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}

export default nextConfig
