// Mobile mirror of apps/web/lib/listingMap.ts — keeps browse cards consistent
// between web and mobile (same labels, emoji fallbacks and price formatting).

export const DEPT_LABEL: Record<string, string> = {
  electronics: 'Electronics', fashion: 'Fashion', home_garden: 'Home & Garden',
  sport: 'Sport', gaming: 'Gaming', gift_ideas: 'Gift Ideas', kids_baby: 'Kids & Baby',
  property: 'Property', health_fitness: 'Health, Fitness & Diet', food_store: 'Food Store',
  retro_vintage: 'Retro & Vintage', grab_it_now: 'Grab It Now', handy_help: 'Handy Help',
  pet_shop: 'Pet Shop', motors: 'Motors', services: 'Services', collectables: 'Collectables',
  jobs: 'Jobs', other: 'Other',
}

export const COND_LABEL: Record<string, string> = {
  new: 'New', like_new: 'Like New', very_good: 'Very Good', good: 'Good', fair: 'Fair', spares: 'For Parts',
}

// UI display name -> Prisma Department enum value (for search/getByDept).
export const DEPT_ENUM: Record<string, string> = {
  'Home & Garden': 'home_garden', 'Jobs': 'jobs', 'Fashion': 'fashion', 'Sport': 'sport',
  'Gaming': 'gaming', 'Electronics': 'electronics', 'Gift Ideas': 'gift_ideas', 'Kids & Baby': 'kids_baby',
  'Property': 'property', 'Health & Fitness': 'health_fitness', 'Food Store': 'food_store',
  'Retro & Vintage': 'retro_vintage', 'Grab It Now': 'grab_it_now', 'Handy Help': 'handy_help', 'Pet Shop': 'pet_shop',
}

// Emoji fallback per department (used when a listing has no image).
export const DEPT_EMOJI: Record<string, string> = {
  electronics: '📱', fashion: '👕', home_garden: '🛋️', sport: '🚴', gaming: '🎮',
  gift_ideas: '🎁', kids_baby: '🧸', property: '🏠', health_fitness: '💊', food_store: '🛒',
  retro_vintage: '📻', grab_it_now: '⚡', handy_help: '🛠️', pet_shop: '🐾', motors: '🏍️',
  services: '💼', collectables: '🃏', jobs: '💼', other: '🛍️',
}

export interface Card {
  ref: string
  title: string
  price: string
  image?: string
  emoji: string
  location: string
  condition?: string
  isFeatured: boolean
}

// Convert a DB listing (as returned by the tRPC browse endpoints) into the
// shape our card component renders. Money is already computed server-side; we
// only format it for display (§10.2 — never recompute prices on the client).
export function toCard(l: any): Card {
  const price = Number(l.price)
  return {
    ref: l.id,
    title: l.title,
    price: `€${price % 1 === 0 ? price.toLocaleString() : price.toFixed(2)}`,
    image: Array.isArray(l.images) ? l.images[0] : undefined,
    emoji: DEPT_EMOJI[l.department] ?? '🛍️',
    location: l.location ?? 'Gran Canaria',
    condition: l.condition ? (COND_LABEL[l.condition] ?? l.condition) : undefined,
    isFeatured: !!l.isFeatured,
  }
}
