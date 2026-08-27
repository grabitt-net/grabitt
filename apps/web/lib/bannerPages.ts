// The pages a site-wide sponsor banner (sponsor_top / sponsor_footer) can be
// targeted to. Keys are stored on Banner.pages; an empty pages[] = every page.
export const BANNER_PAGE_OPTIONS: [key: string, label: string][] = [
  ['home', 'Home'],
  ['search', 'Search'],
  ['jobs', 'Recruitment'],
  ['property', 'Property'],
  ['directory', 'Business Directory'],
  ['for-business', 'For Business'],
  ['community', 'Grabitt Guides'],
  ['grabit', 'Grabitt NOW'],
  ['account', 'Dashboard'],
  ['category', 'Category pages'],
  ['listings', 'Listing pages'],
  ['help', 'Help'],
]

// When a banner targets "Category pages" it can either cover every category
// (the generic 'category' key) or be drilled down to specific category pages by
// their slug. These are the department/category slugs /category/[slug] serves —
// keep in sync with DEPT_LABEL in listingMap.
export const BANNER_CATEGORY_OPTIONS: [slug: string, label: string][] = [
  ['motors', 'Motors'],
  ['property', 'Property'],
  ['electronics', 'Electronics'],
  ['fashion', 'Fashion'],
  ['home_garden', 'Home & Garden'],
  ['sport', 'Sport'],
  ['gaming', 'Gaming'],
  ['gift_ideas', 'Gift Ideas'],
  ['kids_baby', 'Kids & Baby'],
  ['health_fitness', 'Health, Fitness & Diet'],
  ['food_store', 'Food Store'],
  ['retro_vintage', 'Retro & Vintage'],
  ['pet_shop', 'Pet Supplies'],
  ['hobbies_crafts', 'Hobbies & Crafts'],
  ['collectables', 'Collectables'],
  ['services', 'Services'],
  ['handy_help', 'Handy Help'],
  ['grab_it_now', 'Grab It Now'],
]

// The set of category slugs, for telling a specific-category target apart from
// the generic 'category' key and the other page keys.
export const BANNER_CATEGORY_SLUGS: string[] = BANNER_CATEGORY_OPTIONS.map(([s]) => s)

// Map a pathname to the page key the banner slots target.
export function bannerPageKey(pathname: string | null | undefined): string {
  if (!pathname || pathname === '/') return 'home'
  const seg = pathname.split('/').filter(Boolean)[0] ?? 'home'
  return seg
}
