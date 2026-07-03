import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, '..', '..')

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
    // Trace from the monorepo root so pnpm's hoisted packages are reachable, and
    // force-include the Prisma query engine binary into the API function bundles
    // (Next's tracer doesn't pick up the .prisma/client engine on its own).
    outputFileTracingRoot: repoRoot,
    outputFileTracingIncludes: {
      '/api/**/*': [
        '../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/*.node',
        '../../node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/**',
        '../../node_modules/.prisma/client/*.node',
      ],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}

export default nextConfig
