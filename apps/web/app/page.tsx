import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import Hero from '@/components/marketplace/Hero'
import FeaturedStrip from '@/components/marketplace/FeaturedStrip'
import CategoryGrid from '@/components/marketplace/CategoryGrid'
import AffiliateBanner from '@/components/marketplace/AffiliateBanner'
import SeasonalBanner from '@/components/marketplace/SeasonalBanner'
import TrustStrip from '@/components/marketplace/TrustStrip'
import BottomCarousel from '@/components/marketplace/BottomCarousel'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHost'

// Section order mirrors grabitt-homepage-v3-1-15.html:
// header (logo + search + icon-rail) → quick actions + Grab It Now (Hero)
// → Featured strip → Departments → Affiliate → What's New → footer
// → bottom "Just Listed" carousel.
export default function HomePage() {
  return (
    <PanelProvider>
      <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 160, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
        <Topbar />
        <Hero />
        <FeaturedStrip />
        <CategoryGrid />
        <AffiliateBanner />
        <SeasonalBanner />
        <TrustStrip />
        <BottomCarousel />
        <CartFab />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}
