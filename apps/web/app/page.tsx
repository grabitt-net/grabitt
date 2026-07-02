import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import Hero from '@/components/marketplace/Hero'
import FeaturedStrip from '@/components/marketplace/FeaturedStrip'
import CategoryGrid from '@/components/marketplace/CategoryGrid'
import AffiliateBanner from '@/components/marketplace/AffiliateBanner'
import SeasonalBanner from '@/components/marketplace/SeasonalBanner'
import JustListed from '@/components/marketplace/JustListed'
import TrustStrip from '@/components/marketplace/TrustStrip'
import BottomCarousel from '@/components/marketplace/BottomCarousel'
import PanelHost from '@/components/marketplace/PanelHost'

// Section order mirrors grabitt-homepage-v3-1-15.html:
// header (logo + search + icon-rail) → quick actions + Grab It Now (Hero)
// → Featured strip → Departments → Affiliate → What's New → footer
// → bottom "Just Listed" carousel.
export default function HomePage() {
  return (
    <PanelProvider>
      <main style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 160 }}>
        <Topbar />
        <Hero />
        <FeaturedStrip />
        <CategoryGrid />
        <AffiliateBanner />
        <SeasonalBanner />
        <JustListed />
        <TrustStrip />
        <BottomCarousel />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}
