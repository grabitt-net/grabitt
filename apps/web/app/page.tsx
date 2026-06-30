import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import Hero from '@/components/marketplace/Hero'
import CategoryGrid from '@/components/marketplace/CategoryGrid'
import AffiliateBanner from '@/components/marketplace/AffiliateBanner'
import ListingsRow from '@/components/marketplace/ListingsRow'
import TrustStrip from '@/components/marketplace/TrustStrip'
import BottomCarousel from '@/components/marketplace/BottomCarousel'
import PanelHost from '@/components/marketplace/PanelHost'

export default function HomePage() {
  return (
    <PanelProvider>
      <main style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 160 }}>
        <Topbar />
        <Hero />
        <CategoryGrid />
        <AffiliateBanner />
        <ListingsRow title="Featured" seeAllHref="/listings" />
        <ListingsRow title="Near You" seeAllHref="/listings?sort=nearby" />
        <TrustStrip />
        <BottomCarousel />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}
