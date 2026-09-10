import type { MetadataRoute } from 'next'
import { prisma } from 'server/src/db'

const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.grabitt.net'

// Query at request time so new listings appear without a rebuild.
export const runtime = 'nodejs'
export const revalidate = 3600 // re-cache the sitemap hourly

// Public hub routes.
const STATIC = ['', '/search', '/jobs', '/property', '/directory', '/for-business', '/community', '/help', '/grabitt-now']
// Footer info pages (also admin-editable copy).
const INFO = ['/about', '/why', '/pricing', '/contact', '/delivery', '/terms', '/guarantee', '/scam-centre', '/advertise', '/economic', '/dos', '/suggest', '/news']
const CATEGORIES = [
  'electronics', 'fashion', 'home_garden', 'sport', 'gaming', 'motors', 'retro_vintage',
  'pet_shop', 'kids_baby', 'collectables', 'hobbies_crafts', 'gift_ideas', 'services', 'handy_help',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Individual active listings — capped and ordered by freshness so the sitemap
  // stays a reasonable size while covering everything currently for sale.
  let listings: { url: string; lastModified: Date; changeFrequency: 'weekly'; priority: number }[] = []
  try {
    const rows = await prisma.listing.findMany({
      where: { status: 'active' as never },
      select: { id: true, updatedAt: true },
      orderBy: { bumpedAt: 'desc' },
      take: 10000,
    })
    listings = rows.map(l => ({ url: `${base}/listings/${l.id}`, lastModified: l.updatedAt ?? now, changeFrequency: 'weekly' as const, priority: 0.5 }))
  } catch { /* DB unavailable at build — hubs still ship */ }

  return [
    ...STATIC.map(p => ({ url: `${base}${p}`, lastModified: now, changeFrequency: 'daily' as const, priority: p === '' ? 1 : 0.7 })),
    ...CATEGORIES.map(c => ({ url: `${base}/category/${c}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.6 })),
    ...INFO.map(p => ({ url: `${base}${p}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.4 })),
    ...listings,
  ]
}
