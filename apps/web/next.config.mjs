import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin'

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
  // Copies the Prisma query engine binary next to the server bundles — the
  // canonical fix for Prisma + Next.js in a pnpm monorepo on Vercel.
  webpack: (config, { isServer }) => {
    if (isServer) config.plugins = [...config.plugins, new PrismaPlugin()]
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}

export default nextConfig
