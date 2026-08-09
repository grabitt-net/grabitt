import type { Metadata } from 'next'
import { Inter, Sora } from 'next/font/google'
import { TrpcProvider } from '@/providers/TrpcProvider'
import { ToastProvider } from '@/context/ToastContext'
import { CartProvider } from '@/context/CartContext'
import AuthBootstrap from '@/components/AuthBootstrap'
import ConsentGate from '@/components/ConsentGate'
import AttributesOnboarding from '@/components/AttributesOnboarding'
import CookieBanner from '@/components/CookieBanner'
import StickyBottomBanner from '@/components/marketplace/StickyBottomBanner'
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

export const metadata: Metadata = {
  title: 'Grabitt — Gran Canaria Marketplace',
  description: 'Buy, sell and discover in Gran Canaria',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="min-h-full"><TrpcProvider><ToastProvider><CartProvider><AuthBootstrap /><ConsentGate /><AttributesOnboarding />{children}<CookieBanner /><StickyBottomBanner /><UiHost /></CartProvider></ToastProvider></TrpcProvider></body>
    </html>
  )
}
