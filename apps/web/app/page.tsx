import { PanelProvider } from '@/context/PanelContext'
import Topbar from '@/components/marketplace/Topbar'
import SearchRow from '@/components/marketplace/SearchRow'
import GrabItNowStrip from '@/components/marketplace/GrabItNowStrip'
import IconRail from '@/components/marketplace/IconRail'
import CategoryGrid from '@/components/marketplace/CategoryGrid'
import AffiliateBanner from '@/components/marketplace/AffiliateBanner'
import SeasonalBanner from '@/components/marketplace/SeasonalBanner'
import FeaturedStrip from '@/components/marketplace/FeaturedStrip'
import JustListed from '@/components/marketplace/JustListed'
import TrustStrip from '@/components/marketplace/TrustStrip'
import BottomCarousel from '@/components/marketplace/BottomCarousel'
import PanelHost from '@/components/marketplace/PanelHost'

export default function HomePage() {
  return (
    <PanelProvider>
      <main style={{ background: 'var(--cream)', minHeight: '100vh', paddingBottom: 160 }}>
        <Topbar />
        <SearchRow />
        <GrabItNowStrip />
        <IconRail />
        <CategoryGrid />
        <AffiliateBanner />
        <SeasonalBanner />
        <FeaturedStrip />
        <JustListed />
        <TrustStrip />
        <BottomCarousel />
        <PanelHost />
      </main>
    </PanelProvider>
  )
}
