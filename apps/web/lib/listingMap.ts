// Maps between the DB listing shape (Prisma enums, Decimal price) and the shape
// the marketplace panels/cards expect. Keeps browse screens consistent.

export const DEPT_LABEL: Record<string, string> = {
  electronics: 'Electronics', fashion: 'Fashion', home_garden: 'Home & Garden',
  sport: 'Sport', gaming: 'Gaming', gift_ideas: 'Gift Ideas', kids_baby: 'Kids & Baby',
  property: 'Property', health_fitness: 'Health, Fitness & Diet', food_store: 'Food Store',
  retro_vintage: 'Retro & Vintage', grab_it_now: 'Grab It Now', handy_help: 'Handy Help',
  pet_shop: 'Pet Shop', motors: 'Motors', services: 'Services', collectables: 'Collectables',
  hobbies_crafts: 'Hobbies & Crafts', jobs: 'Jobs', other: 'Other',
}

export const COND_LABEL: Record<string, string> = {
  new: 'New', like_new: 'Like New', very_good: 'Very Good', good: 'Good', fair: 'Fair', spares: 'For Parts',
}

// UI display name -> Prisma Department enum value (for getByDept).
export const DEPT_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(DEPT_LABEL).map(([enumVal, label]) => [label, enumVal]),
)

// Emoji fallback per department (used when a listing has no image).
const DEPT_EMOJI: Record<string, string> = {
  electronics: '📱', fashion: '👕', home_garden: '🛋️', sport: '🚴', gaming: '🎮',
  gift_ideas: '🎁', kids_baby: '🧸', property: '🏠', health_fitness: '💊', food_store: '🛒',
  retro_vintage: '📻', grab_it_now: '⚡', handy_help: '🛠️', pet_shop: '🐾', motors: '🏍️',
  services: '💼', collectables: '🃏', hobbies_crafts: '🧶', jobs: '💼', other: '🛍️',
}

export interface DbListing {
  id: string
  title: string
  price: string | number
  department: string
  condition?: string
  images?: string[]
  location?: string
  sellerId?: string
  isFeatured?: boolean
  deliveryFee?: string | number
  deliveryMethod?: 'courier' | 'in_person' | null
  grabItNowUntil?: string | Date | null
}

// Grab It Now items are bought instantly and can never be basketed.
export function isGrabItNow(l: DbListing) {
  return !!l.grabItNowUntil && new Date(l.grabItNowUntil) > new Date()
}

// Convert a DB listing into the item passed to openPanel('listing', item).
export function toPanelItem(l: DbListing) {
  return {
    id: l.id,
    title: l.title,
    price: `€${Number(l.price) % 1 === 0 ? Number(l.price) : Number(l.price).toFixed(2)}`,
    image: l.images?.[0] ?? null,
    images: l.images ?? [],
    emoji: DEPT_EMOJI[l.department] ?? '🛍️',
    location: l.location ?? 'Gran Canaria',
    category: DEPT_LABEL[l.department] ?? l.department,
    condition: l.condition ? (COND_LABEL[l.condition] ?? l.condition) : '',
    sellerId: l.sellerId,
    isFeatured: !!l.isFeatured,
    deliveryFee: Number(l.deliveryFee ?? 0),
    deliveryMethod: l.deliveryMethod ?? undefined,
  }
}

export function deptEmoji(department: string) {
  return DEPT_EMOJI[department] ?? '🛍️'
}
