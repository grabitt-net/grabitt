import type { MetadataRoute } from 'next'

// PWA manifest — enables "Add to Home Screen" with Grabitt branding and the
// brand orange as the theme colour.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Grabitt — Canary Islands Marketplace',
    short_name: 'Grabitt',
    description: 'Buy, sell, hire and discover — local to the Canary Islands.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#F5540A',
    icons: [
      { src: '/grabitt-mark.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
