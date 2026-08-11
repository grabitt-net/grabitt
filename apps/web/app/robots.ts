import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.grabitt.net'

// While the pre-launch lockdown is on, tell crawlers to stay away entirely so
// the holding page never gets indexed. Once live, allow the public marketplace
// but keep private/functional areas out of the index.
export default function robots(): MetadataRoute.Robots {
  if (process.env.MAINTENANCE_MODE === '1') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/api/', '/auth', '/messages', '/orders', '/profile'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
