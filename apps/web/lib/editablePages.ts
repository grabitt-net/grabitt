// The pages whose text Steve can edit from the CRM (Admin → Page Content).
// `key` is the pageKey stored on PageContent and passed to InfoPage as `dept`.
// When a page has saved content, its body renders that rich text in place of the
// built-in copy. Add a row here to expose another InfoPage-based page.
export const EDITABLE_PAGES: { key: string; label: string; path: string }[] = [
  { key: 'about', label: 'About Us', path: '/about' },
  { key: 'why', label: 'Why Us?', path: '/why' },
  { key: 'pricing', label: 'Pricing', path: '/pricing' },
  { key: 'contact', label: 'Contact', path: '/contact' },
  { key: 'delivery', label: 'Delivery', path: '/delivery' },
  { key: 'guarantee', label: 'Grabitt Guarantee', path: '/guarantee' },
  { key: 'scam-centre', label: 'Scam Centre', path: '/scam-centre' },
  { key: 'economic', label: 'Economic Living', path: '/economic' },
  { key: 'dos', label: "Dos & Don'ts", path: '/dos' },
  { key: 'suggest', label: 'Suggest Ideas', path: '/suggest' },
  { key: 'community', label: 'Grabitt Guides', path: '/community' },
]
