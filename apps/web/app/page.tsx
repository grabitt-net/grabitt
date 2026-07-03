import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import Hero from '@/components/marketplace/Hero'
import FeaturedStrip from '@/components/marketplace/FeaturedStrip'
import CategoryGrid from '@/components/marketplace/CategoryGrid'
import ListingsGrid from '@/components/marketplace/ListingsGrid'
import AffiliateBanner from '@/components/marketplace/AffiliateBanner'
import SeasonalBanner from '@/components/marketplace/SeasonalBanner'
import TrustStrip from '@/components/marketplace/TrustStrip'
import BottomCarousel from '@/components/marketplace/BottomCarousel'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHost'

// Responsive: on mobile this is the phone app; on desktop the header spans wide,
// the phone-style chrome (quick actions, featured, categories) stays centered,
// and the ListingsGrid becomes a full-width product grid like a real web store.
export default function HomePage() {
  return (
    <PanelProvider>
      <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 160, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
        <Topbar />
        <div className="home-chrome">
          <Hero />
          <FeaturedStrip />
          <CategoryGrid />
          <AffiliateBanner />
          <SeasonalBanner />
        </div>
        <ListingsGrid />
        <TrustStrip />
        <BottomCarousel />
        <CartFab />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}
