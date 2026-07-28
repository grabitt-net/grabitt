// Property features & amenities — shared by the listing form, the property card,
// and the search filters so the slugs stay consistent.

export type Feature = { slug: string; label: string; icon: string }

export const PROPERTY_FEATURES: Feature[] = [
  { slug: 'garden', label: 'Garden', icon: '🌳' },
  { slug: 'terrace', label: 'Terrace', icon: '🏖' },
  { slug: 'balcony', label: 'Balcony', icon: '🪟' },
  { slug: 'parking', label: 'Parking', icon: '🅿️' },
  { slug: 'pool', label: 'Pool', icon: '🏊' },
  { slug: 'furnished', label: 'Furnished', icon: '🛋' },
  { slug: 'unfurnished', label: 'Unfurnished', icon: '📦' },
  { slug: 'bills_included', label: 'Bills included', icon: '🧾' },
  { slug: 'pets_allowed', label: 'Pets allowed', icon: '🐾' },
  { slug: 'driveway', label: 'Driveway', icon: '🚗' },
  { slug: 'garage', label: 'Garage', icon: '🏠' },
  { slug: 'lift', label: 'Lift', icon: '🛗' },
  { slug: 'wifi', label: 'Wifi', icon: '📶' },
  { slug: 'disabled_access', label: 'Disabled access', icon: '♿' },
  { slug: 'washing_machine', label: 'Washing machine', icon: '🧺' },
  { slug: 'dishwasher', label: 'Dishwasher', icon: '🍽' },
  { slug: 'oven', label: 'Oven', icon: '🔥' },
]

const BY_SLUG = new Map(PROPERTY_FEATURES.map(f => [f.slug, f]))
export const featureLabel = (slug: string) => BY_SLUG.get(slug)?.label ?? slug
export const featureIcon = (slug: string) => BY_SLUG.get(slug)?.icon ?? '•'

// The subset surfaced as quick filters on the search page.
export const FILTERABLE_FEATURES = ['pool', 'garden', 'terrace', 'balcony', 'garage', 'parking', 'furnished', 'pets_allowed', 'lift', 'wifi']
