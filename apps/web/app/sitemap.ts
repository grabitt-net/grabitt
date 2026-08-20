import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.grabitt.net'

// Static + category routes for discovery. Individual listings change constantly
// and are reachable from the category/search pages, so we index the hubs rather
// than every ephemeral item.
const STATIC = ['', '/search', '/jobs', '/property', '/directory', '/for-business', '/community', '/help', '/grabit']
const CATEGORIES = [
  'electronics', 'fashion', 'home_garden', 'sport', 'gaming', 'motors', 'retro_vintage',
  'pet_shop', 'kids_baby', 'collectables', 'hobbies_crafts', 'gift_ideas', 'services', 'handy_help',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    ...STATIC.map(p => ({ url: `${base}${p}`, lastModified: now, changeFrequency: 'daily' as const, priority: p === '' ? 1 : 0.7 })),
    ...CATEGORIES.map(c => ({ url: `${base}/category/${c}`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.6 })),
  ]
}
