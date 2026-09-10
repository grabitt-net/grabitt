import type { Metadata, Viewport } from 'next'
import { Inter, Sora } from 'next/font/google'
import { TrpcProvider } from '@/providers/TrpcProvider'
import { ToastProvider } from '@/context/ToastContext'
import { CartProvider } from '@/context/CartContext'
import AuthBootstrap from '@/components/AuthBootstrap'
import ConsentGate from '@/components/ConsentGate'
import AttributesOnboarding from '@/components/AttributesOnboarding'
import CookieBanner from '@/components/CookieBanner'
import StickyBottomBanner from '@/components/marketplace/StickyBottomBanner'
import ImpersonationBanner from '@/components/marketplace/ImpersonationBanner'
import { UiHost } from '@/lib/ui'
import './globals.css'

// Inter is the UI/body workhorse; Sora carries headings & display. They're
// loaded under the original CSS variable names (--font-nunito / --font-comfortaa)
// so the whole app inherits the new typography without touching each component.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-comfortaa',
  weight: ['400', '500', '600', '700', '800'],
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.grabitt.net'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Grabitt — Canary Islands Marketplace',
    template: '%s · Grabitt',
  },
  description: 'Buy, sell, hire and discover — local to the Canary Islands. Secure escrow, verified sellers and the Grabitt Guarantee on every order.',
  applicationName: 'Grabitt',
  keywords: ['Gran Canaria', 'marketplace', 'buy', 'sell', 'jobs', 'property', 'Canary Islands', 'second hand'],
  openGraph: {
    type: 'website',
    siteName: 'Grabitt',
    title: 'Grabitt — Canary Islands Marketplace',
    description: 'Buy, sell, hire and discover — local to the Canary Islands.',
    url: APP_URL,
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grabitt — Canary Islands Marketplace',
    description: 'Buy, sell, hire and discover — local to the Canary Islands.',
  },
}

export const viewport: Viewport = {
  themeColor: '#F5540A',
  width: 'device-width',
  initialScale: 1,
}

// Site-wide structured data so search/AI engines understand the entity and can
// offer a sitelinks search box. Product-level JSON-LD is added per listing.
const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#organization`,
      name: 'Grabitt',
      url: APP_URL,
      logo: `${APP_URL}/icon.png`,
      description: 'The local-first online marketplace for the Canary Islands — buy, sell, hire and discover, with secure escrow and the Grabitt Guarantee.',
      areaServed: 'Canary Islands',
      email: 'support@grabitt.net',
    },
    {
      '@type': 'WebSite',
      '@id': `${APP_URL}/#website`,
      url: APP_URL,
      name: 'Grabitt',
      publisher: { '@id': `${APP_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${APP_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="min-h-full">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }} />
        <TrpcProvider><ToastProvider><CartProvider><AuthBootstrap /><ConsentGate /><AttributesOnboarding /><ImpersonationBanner />{children}<CookieBanner /><StickyBottomBanner /><UiHost /></CartProvider></ToastProvider></TrpcProvider></body>
    </html>
  )
}
