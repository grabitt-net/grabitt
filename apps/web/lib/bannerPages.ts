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

// Map a pathname to the page key the banner slots target.
export function bannerPageKey(pathname: string | null | undefined): string {
  if (!pathname || pathname === '/') return 'home'
  const seg = pathname.split('/').filter(Boolean)[0] ?? 'home'
  return seg
}
