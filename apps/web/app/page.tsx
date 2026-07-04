import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import BannerSlot from '@/components/marketplace/BannerSlot'
import Hero from '@/components/marketplace/Hero'
import FeaturedStrip from '@/components/marketplace/FeaturedStrip'
import CategoryGrid from '@/components/marketplace/CategoryGrid'
import ListingsGrid from '@/components/marketplace/ListingsGrid'
import TrustStrip from '@/components/marketplace/TrustStrip'
import BottomCarousel from '@/components/marketplace/BottomCarousel'
import CartFab from '@/components/marketplace/CartFab'
import PanelHost from '@/components/marketplace/PanelHost'

// Marketplace/Directory layout (per UI/UX design system):
// header (search-first) → CMS hero banner → quick actions → categories →
// featured → CMS mid ad banner → product grid → trust → footer.
// Banner slots (home_top / home_mid) are CMS-driven from the admin Banners view.
export default function HomePage() {
  return (
    <PanelProvider>
      <main className="app-shell" style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 160, boxShadow: '0 0 40px rgba(0,0,0,0.06)' }}>
        <Topbar />
        <BannerSlot position="home_top" />
        <div className="home-chrome">
          <Hero />
          <CategoryGrid />
          <FeaturedStrip />
        </div>
        <BannerSlot position="home_mid" />
        <ListingsGrid />
        <TrustStrip />
        <BottomCarousel />
        <CartFab />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}
